import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { PaymentEntity } from './entities/payment.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { PayDto } from './dto/payment.dto';
import { OrderStatusEnum } from '../../common/enums/order-status.enum';
import { PaymentMethodEnum } from '../../common/enums/payment-method.enum';
import { PaymentStatusEnum } from '../../common/enums/payment-status.enum';
import { RoleEnum } from '../../common/enums/role.enum';

const REF_PREFIX: Record<PaymentMethodEnum, string> = {
  [PaymentMethodEnum.CASH_ON_DELIVERY]: 'COD',
  [PaymentMethodEnum.CARD_SIMULATED]: 'CARD',
  [PaymentMethodEnum.MOBILE_BANKING_SIMULATED]: 'MFS',
};

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private assertOwnerOrAdmin(orderOwnerId: string, user: AuthUser) {
    if (user.role !== RoleEnum.ADMIN && orderOwnerId !== user.user_id) {
      throw new ForbiddenException('You can only access your own payments');
    }
  }

  async pay(dto: PayDto, user: AuthUser) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id: dto.order_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      this.assertOwnerOrAdmin(order.user_id, user);

      if (order.order_status === OrderStatusEnum.CANCELLED) {
        throw new BadRequestException('A cancelled order cannot be paid');
      }
      if (order.order_status === OrderStatusEnum.PAID) {
        throw new ConflictException('This order is already paid');
      }

      const payment = await manager.findOne(PaymentEntity, {
        where: { order_id: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found for this order');
      }
      if (payment.status !== PaymentStatusEnum.PENDING) {
        throw new ConflictException(`This payment is already ${payment.status}`);
      }

      if (payment.method === PaymentMethodEnum.CASH_ON_DELIVERY) {
        throw new BadRequestException(
          'Cash on delivery is paid when the goods are handed over',
        );
      }

      payment.status = PaymentStatusEnum.PAID;
      payment.paid_at = new Date();
      payment.transaction_ref = `SIM-${REF_PREFIX[payment.method]}-${randomUUID()
        .replace(/-/g, '')
        .slice(0, 12)
        .toUpperCase()}`;
      await manager.save(payment);

      order.order_status = OrderStatusEnum.PAID;
      await manager.save(order);
    });

    return this.findByOrder(dto.order_id, user);
  }

  async findOne(id: number, user: AuthUser) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    this.assertOwnerOrAdmin(payment.order.user_id, user);
    return payment;
  }

  async findByOrder(orderId: number, user: AuthUser) {
    const payment = await this.paymentRepository.findOne({
      where: { order_id: orderId },
      relations: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }
    this.assertOwnerOrAdmin(payment.order.user_id, user);
    return payment;
  }
}