import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('brands')
export class BrandEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url!: string | null;
}