import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CartEntity } from './entities/cart.entity';
import { CartItemEntity } from './entities/cart-item.entity';
import { ProductEntity } from '../product/entities/product.entity';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { CartStatusEnum } from '../../common/enums/cart-status.enum';
import { fromCents, toCents } from '../../common/helpers/money.helper';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ---------- view ----------

  async getCart(userId: string) {
    const cart = await this.cartRepository.findOne({
      where: { user_id: userId, status: CartStatusEnum.ACTIVE },
      relations: { items: { product: { category: true } } },
      order: { items: { id: 'ASC' } },
    });
    return this.toResponse(userId, cart);
  }

  // ---------- add / increase ----------

  async addItem(userId: string, dto: AddCartItemDto) {
    const quantity = dto.quantity ?? 1;

    const cart = await this.getOrCreateActiveCart(userId);

    await this.dataSource.transaction(async (manager) => {
      // lock the cart row so two requests on the same cart run one after the other
      await this.lockActiveCart(manager, cart.id);

      const product = await this.getPurchasableProduct(manager, dto.product_id);
      const item = await manager.findOne(CartItemEntity, {
        where: { cart_id: cart.id, product_id: product.id },
      });

      const newQuantity = (item?.quantity ?? 0) + quantity;
      this.assertStock(product, newQuantity);

      if (item) {
        item.quantity = newQuantity;
        await manager.save(item);
      } else {
        await manager.save(
          manager.create(CartItemEntity, { cart_id: cart.id, product_id: product.id, quantity: newQuantity }),
        );
      }
    });

    return this.getCart(userId);
  }

  // ---------- change quantity ----------

  async updateItem(userId: string, itemId: number, dto: UpdateCartItemDto) {
    await this.dataSource.transaction(async (manager) => {
      const cart = await this.findLockedActiveCartOrFail(manager, userId);

      const item = await manager.findOne(CartItemEntity, { where: { id: itemId, cart_id: cart.id } });
      if (!item) {
        throw new NotFoundException('Cart item not found');
      }

      const product = await this.getPurchasableProduct(manager, item.product_id);
      this.assertStock(product, dto.quantity);

      item.quantity = dto.quantity;
      await manager.save(item);
    });

    return this.getCart(userId);
  }

  // ---------- remove one item ----------

  async removeItem(itemId: number, userId: string) {
    await this.dataSource.transaction(async (manager) => {
      const cart = await this.findLockedActiveCartOrFail(manager, userId);
      const result = await manager.delete(CartItemEntity, { id: itemId, cart_id: cart.id });
      if (!result.affected) {
        throw new NotFoundException('Cart item not found');
      }
    });

    return this.getCart(userId);
  }

  // ---------- clear ----------

  async clear(userId: string) {
    await this.dataSource.transaction(async (manager) => {
      const cart = await manager.findOne(CartEntity, {
        where: { user_id: userId, status: CartStatusEnum.ACTIVE },
        lock: { mode: 'pessimistic_write' },
      });
      if (cart) {
        await manager.delete(CartItemEntity, { cart_id: cart.id });
      }
    });

    return this.getCart(userId);
  }

  // ---------- helpers ----------

  // One active cart per user. The code looks first and creates only when there is none;
  // a partial unique index in the database catches the rare race of two creates at once.
  private async getOrCreateActiveCart(userId: string): Promise<CartEntity> {
    const find = () =>
      this.cartRepository.findOne({ where: { user_id: userId, status: CartStatusEnum.ACTIVE } });

    const existing = await find();
    if (existing) return existing;

    try {
      return await this.cartRepository.save(
        this.cartRepository.create({ user_id: userId, status: CartStatusEnum.ACTIVE }),
      );
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        const created = await find();
        if (created) return created;
      }
      throw error;
    }
  }

  private async lockActiveCart(manager: EntityManager, cartId: number): Promise<void> {
    const locked = await manager.findOne(CartEntity, {
      where: { id: cartId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked || locked.status !== CartStatusEnum.ACTIVE) {
      throw new ConflictException('This cart was just checked out, please try again');
    }
  }

  private async findLockedActiveCartOrFail(manager: EntityManager, userId: string): Promise<CartEntity> {
    const cart = await manager.findOne(CartEntity, {
      where: { user_id: userId, status: CartStatusEnum.ACTIVE },
      lock: { mode: 'pessimistic_write' },
    });
    if (!cart) {
      throw new NotFoundException('You have no active cart');
    }
    return cart;
  }

  // the product must exist, be active, and sit in an active category (same rule as the catalogue)
  private async getPurchasableProduct(manager: EntityManager, productId: number): Promise<ProductEntity> {
    const product = await manager.findOne(ProductEntity, {
      where: { id: productId },
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!product.is_active || !product.category.is_active) {
      throw new BadRequestException(`"${product.name}" is not available right now`);
    }
    return product;
  }

  private assertStock(product: ProductEntity, wanted: number): void {
    if (product.stock <= 0) {
      throw new BadRequestException(`"${product.name}" is out of stock`);
    }
    if (wanted > product.stock) {
      throw new BadRequestException(`Only ${product.stock} of "${product.name}" in stock`);
    }
  }

  private toResponse(userId: string, cart: CartEntity | null) {
    let totalCents = 0;
    let itemCount = 0;

    const items = (cart?.items ?? []).map((item) => {
      const lineCents = toCents(item.product.price) * item.quantity;
      totalCents += lineCents;
      itemCount += item.quantity;
      return {
        id: item.id,
        product_id: item.product_id,
        name: item.product.name,
        sku: item.product.sku,
        image_url: item.product.image_url,
        unit_price: item.product.price,
        quantity: item.quantity,
        line_total: fromCents(lineCents),
        stock: item.product.stock,
        // false when the product or its category was deactivated, or stock dropped below the quantity in the cart
        is_available:
          item.product.is_active &&
          item.product.category.is_active &&
          item.product.stock >= item.quantity,
      };
    });

    return {
      id: cart?.id ?? null,
      user_id: userId,
      status: CartStatusEnum.ACTIVE,
      items,
      item_count: itemCount,
      total_amount: fromCents(totalCents),
    };
  }
}