import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ServiceEntity } from './service.entity';

@Entity('service_categories')
export class ServiceCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_active!: boolean;

  @CreateDateColumn({
    type: 'timestamp',
  })
  created_at!: Date;

  @OneToMany(
    () => ServiceEntity,
    (service) => service.category,
  )
  services!: ServiceEntity[];
}