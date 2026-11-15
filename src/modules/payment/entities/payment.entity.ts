import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethodEnum } from '../../../common/enums/payment-method.enum';
import { PaymentStatusEnum } from '../../../common/enums/payment-status.enum';
import { OrderEntity } from '../../order/entities/order.entity';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', unique: true })
  order_id!: number;

  @OneToOne(() => OrderEntity, (order) => order.payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ type: 'enum', enum: PaymentMethodEnum })
  method!: PaymentMethodEnum;

  @Column({ type: 'enum', enum: PaymentStatusEnum, default: PaymentStatusEnum.PENDING })
  status!: PaymentStatusEnum;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transaction_ref!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paid_at!: Date | null;
}