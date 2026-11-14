import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentEntity } from '../payment/entities/payment.entity';
import { CartEntity } from '../cart/entities/cart.entity';
import { CartItemEntity } from '../cart/entities/cart-item.entity';
import { ProductEntity } from '../product/entities/product.entity';
import { CategoryEntity } from '../catalogue/entities/category.entity';
import { CheckoutDto, ListOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { CartStatusEnum } from '../../common/enums/cart-status.enum';
import { FulfilmentMethodEnum } from '../../common/enums/fulfilment-method.enum';
import { OrderStatusEnum } from '../../common/enums/order-status.enum';
import { RoleEnum } from '../../common/enums/role.enum';
import { PaymentStatusEnum } from '../../common/enums/payment-status.enum';
import { fromCents, toCents } from '../../common/helpers/money.helper';
import { buildPaginatedResponse, DEFAULT_PAGE_LIMIT } from '../../common/helpers/pagination.helper';

// which status changes an admin may make
const ALLOWED_TRANSITIONS: Record<OrderStatusEnum, OrderStatusEnum[]> = {
  [OrderStatusEnum.PENDING]: [OrderStatusEnum.PAID, OrderStatusEnum.CANCELLED],
  // a paid order cannot be cancelled for now (there is no refund state for payments)
  [OrderStatusEnum.PAID]: [],
  [OrderStatusEnum.CANCELLED]: [],
};

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // a normal user may only open their own orders; an admin may open any
  private assertOwnerOrAdmin(order: OrderEntity, user: AuthUser) {
    if (user.role !== RoleEnum.ADMIN && order.user_id !== user.user_id) {
      throw new ForbiddenException('You can only access your own orders');
    }
  }

  // ---------- checkout (one database transaction) ----------

  async checkout(userId: string, dto: CheckoutDto) {
    const isDelivery = dto.fulfilment_method === FulfilmentMethodEnum.DELIVERY;
    const deliveryAddress = isDelivery ? (dto.delivery_address ?? '').trim() : null;
    if (isDelivery && !deliveryAddress) {
      throw new BadRequestException('delivery_address is required for delivery');
    }

    // Anything thrown inside the callback rolls the whole transaction back.
    const orderId = await this.dataSource.transaction(async (manager) => {
      // 1. lock the user's active cart, so the same cart cannot be checked out twice at once
      const cart = await manager.findOne(CartEntity, {
        where: { user_id: userId, status: CartStatusEnum.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cart) {
        throw new BadRequestException('Your cart is empty');
      }
      const cartItems = await manager.find(CartItemEntity, {
        where: { cart_id: cart.id },
        order: { id: 'ASC' },
      });
      if (cartItems.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      // 2. lock the product rows (always in id order, so two checkouts cannot deadlock)
      const productIds = [...new Set(cartItems.map((item) => item.product_id))].sort((a, b) => a - b);
      const products = await manager.find(ProductEntity, {
        where: { id: In(productIds) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const productById = new Map(products.map((product) => [product.id, product]));

      const categoryIds = [...new Set(products.map((product) => product.category_id))];
      const categories = categoryIds.length
        ? await manager.find(CategoryEntity, { where: { id: In(categoryIds) } })
        : [];
      const categoryById = new Map(categories.map((category) => [category.id, category]));

      // 3. check every item first and report all problems together
      const problems: string[] = [];
      for (const item of cartItems) {
        const product = productById.get(item.product_id);
        if (!product || !product.is_active || !categoryById.get(product.category_id)?.is_active) {
          problems.push(`Product ${item.product_id} is no longer available`);
        } else if (product.stock < item.quantity) {
          problems.push(
            `Not enough stock for "${product.name}": you want ${item.quantity}, only ${product.stock} left`,
          );
        }
      }
      if (problems.length > 0) {
        throw new BadRequestException({ message: problems, error: 'Bad Request', statusCode: 400 });
      }

      // 4. create the order and its items; unit_price is copied from the locked product row
      const lines = cartItems
        .map((item) => ({ item, product: productById.get(item.product_id) as ProductEntity }))
        .sort((a, b) => a.product.id - b.product.id);

      const totalCents = lines.reduce(
        (sum, { item, product }) => sum + toCents(product.price) * item.quantity,
        0,
      );
      const totalAmount = fromCents(totalCents);

      const order = await manager.save(
        manager.create(OrderEntity, {
          user_id: userId,
          total_amount: totalAmount,
          fulfilment_method: dto.fulfilment_method,
          delivery_address: deliveryAddress,
          order_status: OrderStatusEnum.PENDING,
        }),
      );

      await manager.insert(
        OrderItemEntity,
        lines.map(({ item, product }) => ({
          order_id: order.id,
          product_id: product.id,
          quantity: item.quantity,
          unit_price: product.price,
        })),
      );

      // 5. reduce stock; the "stock >= qty" guard means it can never go below zero
      for (const { item, product } of lines) {
        const result = await manager
          .createQueryBuilder()
          .update(ProductEntity)
          .set({ stock: () => 'stock - :qty' })
          .where('id = :productId AND stock >= :qty', { productId: product.id, qty: item.quantity })
          .execute();
        if (!result.affected) {
          throw new ConflictException(`Not enough stock for "${product.name}"`);
        }
      }

      // 6. create the payment (still pending; POST /payments/pay marks it paid)
      await manager.save(
        manager.create(PaymentEntity, {
          order_id: order.id,
          method: dto.payment_method,
          status: PaymentStatusEnum.PENDING,
          amount: totalAmount,
          transaction_ref: null,
          paid_at: null,
        }),
      );

      // 7. close the cart
      await manager.update(CartEntity, cart.id, { status: CartStatusEnum.CHECKED_OUT });

      return order.id;
    });

    return this.findOne(orderId);
  }

  // ---------- list ----------

  async findAll(query: ListOrdersQueryDto, user: AuthUser) {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const offset = query.offset ?? 0;

    const where: FindOptionsWhere<OrderEntity> = {};
    if (user.role !== RoleEnum.ADMIN) {
      // a normal user only ever sees their own orders, whatever filter they send
      where.user_id = user.user_id;
    } else if (query.user_id) {
      where.user_id = query.user_id;
    }
    if (query.order_status) where.order_status = query.order_status;

    const [data, total] = await this.orderRepository.findAndCount({
      where,
      relations: { payment: true },
      order: { created_at: 'DESC', id: 'DESC' },
      skip: offset,
      take: limit,
    });
    return buildPaginatedResponse(data, total, limit, offset);
  }

  // ---------- detail (items + payment) ----------

  async findOne(id: number, user?: AuthUser) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: { product: true }, payment: true },
      order: { items: { id: 'ASC' } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    // internal calls (after checkout / status change) pass no user; the controller always does
    if (user) {
      this.assertOwnerOrAdmin(order, user);
    }

    const { items, ...rest } = order;
    return {
      ...rest,
      items: items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product.name,
        sku: item.product.sku,
        image_url: item.product.image_url,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: fromCents(toCents(item.unit_price) * item.quantity),
      })),
    };
  }

  // ---------- admin status change ----------

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.order_status === dto.status) {
        throw new BadRequestException(`Order is already ${dto.status}`);
      }
      if (!ALLOWED_TRANSITIONS[order.order_status].includes(dto.status)) {
        throw new BadRequestException(
          `An order cannot be changed from ${order.order_status} to ${dto.status}`,
        );
      }

      if (dto.status === OrderStatusEnum.CANCELLED) {
        // cancelling gives the stock back (product id order, same as checkout)
        const items = await manager.find(OrderItemEntity, {
          where: { order_id: id },
          order: { product_id: 'ASC' },
        });
        for (const item of items) {
          await manager
            .createQueryBuilder()
            .update(ProductEntity)
            .set({ stock: () => 'stock + :qty' })
            .where('id = :productId', { productId: item.product_id, qty: item.quantity })
            .execute();
        }
        // an unpaid payment cannot be completed any more
        await manager.update(
          PaymentEntity,
          { order_id: id, status: PaymentStatusEnum.PENDING },
          { status: PaymentStatusEnum.FAILED },
        );
      }

      if (dto.status === OrderStatusEnum.PAID) {
        // keep the payment record in step with the order
        await manager.update(
          PaymentEntity,
          { order_id: id, status: PaymentStatusEnum.PENDING },
          { status: PaymentStatusEnum.PAID, paid_at: new Date() },
        );
      }

      order.order_status = dto.status;
      await manager.save(order);
    });

    return this.findOne(id);
  }
}