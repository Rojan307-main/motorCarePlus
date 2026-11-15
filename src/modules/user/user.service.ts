import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityPropertyNotFoundError, FindManyOptions, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { RoleEnum } from '../../common/enums/role.enum';

const SALT_ROUNDS = 10;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

export type SafeUser = Omit<UserEntity, 'password_hash'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const email = this.normalizeEmail(dto.email);
    await this.assertEmailAvailable(email);

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      const saved = await this.userRepository.save(
        this.userRepository.create({
          email,
          password_hash,
          full_name: dto.full_name,
          phone_number: dto.phone_number ?? null,
          role: RoleEnum.USER,
        }),
      );
      return this.toSafeUser(saved);
    } catch (e) {
      this.rethrowIfDuplicateEmail(e);
      throw e;
    }
  }

  async findAll(query: FindManyOptions<UserEntity> = {}) {
    const { select, relations, loadRelationIds, withDeleted, take, ...rest } =
      query;

    const safeTake = Math.min(
      Math.max(Number(take) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );

    try {
      const [data, total] = await this.userRepository.findAndCount({
        order: { created_at: 'DESC' },
        ...rest,
        take: safeTake,
      });
      return { data, total };
    } catch (e) {
      if (e instanceof EntityPropertyNotFoundError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findOneByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email: this.normalizeEmail(email) })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    if (dto.full_name !== undefined) {
      user.full_name = dto.full_name;
    }
    if (dto.phone_number !== undefined) {
      user.phone_number = dto.phone_number;
    }
    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);
      if (email !== user.email) {
        await this.assertEmailAvailable(email);
        user.email = email;
      }
    }
    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    try {
      await this.userRepository.save(user);
    } catch (e) {
      this.rethrowIfDuplicateEmail(e);
      throw e;
    }
    return this.findOne(id);
  }

  async updateRole(id: string, role: RoleEnum): Promise<UserEntity> {
    await this.findOne(id);
    await this.userRepository.update(id, { role });
    return this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    try {
      await this.userRepository.remove(user);
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e as any).driverError?.code === PG_FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException('This user has orders and cannot be deleted');
      }
      throw e;
    }
    return { message: 'User deleted' };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const exists = await this.userRepository.exists({ where: { email } });
    if (exists) {
      throw new ConflictException('Email is already registered');
    }
  }

  private rethrowIfDuplicateEmail(e: unknown): void {
    if (
      e instanceof QueryFailedError &&
      (e as any).driverError?.code === PG_UNIQUE_VIOLATION
    ) {
      throw new ConflictException('Email is already registered');
    }
  }

  private toSafeUser(user: UserEntity): SafeUser {
    const { password_hash, ...safe } = user;
    return safe;
  }
}