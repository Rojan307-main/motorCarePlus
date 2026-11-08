import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductTypeEnum } from '../../../common/enums/product-type.enum';
import { VehicleTypeEnum } from '../../../common/enums/vehicle-type.enum';
import { CategoryEntity } from '../../catalogue/entities/category.entity';
import { BrandEntity } from '../../catalogue/entities/brand.entity';
import { ProductCompatibilityEntity } from './product-compatibility.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('IDX_products_category_id')
  @Column({ type: 'int' })
  category_id!: number;

  @ManyToOne(() => CategoryEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;

  @Index('IDX_products_brand_id')
  @Column({ type: 'int' })
  brand_id!: number;

  @ManyToOne(() => BrandEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'brand_id' })
  brand!: BrandEntity;

  @Index('IDX_products_product_type')
  @Column({ type: 'varchar' })
  product_type!: ProductTypeEnum;

  @Index('IDX_products_vehicle_type')
  @Column({ type: 'varchar' })
  vehicle_type!: VehicleTypeEnum;

  @Index('IDX_products_name')
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  market_price!: string | null;

  // the database also has CHECK (stock >= 0)
  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url!: string | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(() => ProductCompatibilityEntity, (compatibility) => compatibility.product)
  compatibilities!: ProductCompatibilityEntity[];
}