import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductTypeEnum } from '../../../common/enums/product-type.enum';

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar' })
  product_type!: ProductTypeEnum;

  @Column({ type: 'int', nullable: true })
  parent_id!: number | null;

  @ManyToOne(() => CategoryEntity, (category) => category.children, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children!: CategoryEntity[];

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;
}
