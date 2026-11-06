import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceEntity } from './service.entity';

@Entity('service_inclusions')
export class ServiceInclusionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: 'int'})
  service_id!: number;

  @ManyToOne(
    () => ServiceEntity,
    (service) => service.inclusions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({name: 'service_id'})
  service!: ServiceEntity;

  @Column({type: 'varchar', length: 255})
  title!: string;

  @Column({type: 'int', default: 0})
  sort_order!: number;
}