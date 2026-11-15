import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, } from 'typeorm';
import { RoleEnum } from '../../../common/enums/role.enum';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar', select: false })
  password_hash!: string;

  @Column({ type: 'varchar' })
  full_name!: string;

  @Column({ type: 'varchar', nullable: true })
  phone_number!: string | null;

  @Column({ type: 'enum', enum: RoleEnum, default: RoleEnum.USER })
  role!: RoleEnum;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}