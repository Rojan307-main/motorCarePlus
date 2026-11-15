import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { FulfilmentMethodEnum } from '../../../common/enums/fulfilment-method.enum';
import { OrderStatusEnum } from '../../../common/enums/order-status.enum';
import { PaymentEntity } from '../../payment/entities/payment.entity';
import { OrderItemEntity } from './order-item.entity';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount!: string;

  @Column({ type: 'enum', enum: FulfilmentMethodEnum })
  fulfilment_method!: FulfilmentMethodEnum;

  // required when fulfilment_method = delivery (also enforced by a CHECK in the database)
  @Column({ type: 'text', nullable: true })
  delivery_address!: string | null;

  @Column({ type: 'enum', enum: OrderStatusEnum, default: OrderStatusEnum.PENDING })
  order_status!: OrderStatusEnum;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items!: OrderItemEntity[];

  @OneToOne(() => PaymentEntity, (payment) => payment.order)
  payment!: PaymentEntity | null;
}