import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { VehicleTypeEnum } from '../../../common/enums/vehicle-type.enum';
import { ServiceCategoryEntity } from './service-category.entity';
import { ServiceInclusionEntity } from './service-inclusion.entity';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  category_id!: number;

  @ManyToOne(
    () => ServiceCategoryEntity,
    (category) => category.services,
    { onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategoryEntity;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar' })
  vehicle_type!: VehicleTypeEnum;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  price!: string;

  @Column({ type: 'int' })
  duration_minutes!: number;

  @Column({ type: 'int', default: 0 })
  warranty_days!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(
    () => ServiceInclusionEntity,
    (inclusion) => inclusion.service,
    { cascade: ['insert', 'update'] },
  )
  inclusions!: ServiceInclusionEntity[];
}