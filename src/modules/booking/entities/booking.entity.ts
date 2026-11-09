import {Column,CreateDateColumn,Entity,JoinColumn,ManyToOne,PrimaryGeneratedColumn} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { VehicleEntity } from '../../vehicle/entities/vehicle.entity';
import { ServiceEntity } from '../../service-catalog/entities/service.entity';
import { VehicleTypeEnum } from '../../../common/enums/vehicle-type.enum';

export enum BookingStatusEnum {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: 'uuid',})
  user_id!: string;

  @ManyToOne(
    () => UserEntity,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({type: 'int',})
  service_id!: number;

  @ManyToOne(
    () => ServiceEntity,
    { onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @Column({type: 'uuid',})
  vehicle_id!: string;

  @ManyToOne(
    () => VehicleEntity,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: VehicleEntity;

  @Column({type: 'enum', enum: VehicleTypeEnum,})
  vehicle_type!: VehicleTypeEnum;

  @Column({type: 'date',})
  booking_date!: string;

  @Column({type: 'time',})
  start_time!: string;

  @Column({type: 'time',})
  end_time!: string;

  @Column({type: 'enum', enum: BookingStatusEnum, default: BookingStatusEnum.PENDING,})
  status!: BookingStatusEnum;

  @CreateDateColumn({type: 'timestamp',})
  created_at!: Date;
}
