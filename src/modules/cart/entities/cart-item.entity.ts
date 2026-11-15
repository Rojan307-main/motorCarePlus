import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProductEntity } from '../../product/entities/product.entity';
import { CartEntity } from './cart.entity';

@Entity('cart_items')
@Unique('UQ_cart_items_cart_product', ['cart_id', 'product_id'])
export class CartItemEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  cart_id!: number;

  @ManyToOne(() => CartEntity, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: CartEntity;

  @Column({ type: 'int' })
  product_id!: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  // the database also has CHECK (quantity >= 1)
  @Column({ type: 'int' })
  quantity!: number;
}