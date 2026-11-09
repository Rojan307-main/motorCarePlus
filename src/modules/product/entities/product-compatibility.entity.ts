import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProductEntity } from './product.entity';
import { VehicleModelEntity } from '../../vehicle/entities/vehicle-model.entity';

@Entity('product_compatibility')
@Unique('UQ_product_compatibility_product_model', ['product_id', 'model_id'])
export class ProductCompatibilityEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  product_id!: number;

  @ManyToOne(() => ProductEntity, (product) => product.compatibilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  // vehicle_models.id is a uuid
  @Index('IDX_product_compatibility_model_id')
  @Column({ type: 'uuid' })
  model_id!: string;

  @ManyToOne(() => VehicleModelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model!: VehicleModelEntity;
}
