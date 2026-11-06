
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceEntity } from './entities/service.entity';
import { ServiceCategoryEntity } from './entities/service-category.entity';
import { ServiceInclusionEntity } from './entities/service-inclusion.entity';

import {
  CreateServiceDto,
  UpdateServiceDto,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto/service-catalog.dto';

import { VehicleTypeEnum } from '../../common/enums/vehicle-type.enum';

@Injectable()
export class ServiceCatalogService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,

    @InjectRepository(ServiceCategoryEntity)
    private readonly categoryRepository: Repository<ServiceCategoryEntity>,

    @InjectRepository(ServiceInclusionEntity)
    private readonly inclusionRepository: Repository<ServiceInclusionEntity>,
  ) {}

  // ==============================
  // SERVICE METHODS
  // ==============================

  async findAll(
    categoryId?: number,
    vehicleType?: VehicleTypeEnum,
    search?: string,
  ): Promise<ServiceEntity[]> {
    const query = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('service.inclusions', 'inclusion')
      .where('service.is_active = :isActive', { isActive: true })
      .andWhere('category.is_active = :categoryActive', {
        categoryActive: true,
      });

    if (categoryId !== undefined) {
      query.andWhere('service.category_id = :categoryId', {
        categoryId,
      });
    }

    if (vehicleType !== undefined) {
      query.andWhere(
        '(service.vehicle_type = :vehicleType OR service.vehicle_type = :both)',
        {
          vehicleType,
          both: VehicleTypeEnum.BOTH,
        },
      );
    }

    if (search?.trim()) {
      query.andWhere('LOWER(service.name) LIKE LOWER(:search)', {
        search: `%${search.trim()}%`,
      });
    }

    return query
      .orderBy('service.created_at', 'DESC')
      .addOrderBy('inclusion.sort_order', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<ServiceEntity> {
    const service = await this.serviceRepository.findOne({
      where: {
        id,
        is_active: true,
      },
      relations: {
        category: true,
        inclusions: true,
      },
      order: {
        inclusions: {
          sort_order: 'ASC',
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async create(
    createServiceDto: CreateServiceDto,
  ): Promise<ServiceEntity> {
    const category = await this.categoryRepository.findOne({
      where: {
        id: createServiceDto.category_id,
        is_active: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Active service category not found');
    }

    const service = this.serviceRepository.create({
      category_id: category.id,
      name: createServiceDto.name,
      vehicle_type: createServiceDto.vehicle_type,
      description: createServiceDto.description ?? null,
      price: createServiceDto.price.toFixed(2),
      duration_minutes: createServiceDto.duration_minutes,
      warranty_days: createServiceDto.warranty_days ?? 0,
      is_active: true,
      inclusions: (createServiceDto.inclusions ?? []).map(
        (inclusion, index) =>
          this.inclusionRepository.create({
            title: inclusion.title,
            sort_order: inclusion.sort_order ?? index,
          }),
      ),
    });

    return this.serviceRepository.save(service);
  }

  async update(
    id: number,
    updateServiceDto: UpdateServiceDto,
  ): Promise<ServiceEntity> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: {
        inclusions: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (updateServiceDto.category_id !== undefined) {
      const category = await this.categoryRepository.findOne({
        where: {
          id: updateServiceDto.category_id,
          is_active: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Active service category not found');
      }

      service.category_id = category.id;
    }

    if (updateServiceDto.name !== undefined) {
      service.name = updateServiceDto.name;
    }

    if (updateServiceDto.vehicle_type !== undefined) {
      service.vehicle_type = updateServiceDto.vehicle_type;
    }

    if (updateServiceDto.description !== undefined) {
      service.description = updateServiceDto.description;
    }

    if (updateServiceDto.price !== undefined) {
      service.price = updateServiceDto.price.toFixed(2);
    }

    if (updateServiceDto.duration_minutes !== undefined) {
      service.duration_minutes = updateServiceDto.duration_minutes;
    }

    if (updateServiceDto.warranty_days !== undefined) {
      service.warranty_days = updateServiceDto.warranty_days;
    }

    if (updateServiceDto.inclusions !== undefined) {
      await this.inclusionRepository.delete({
        service_id: service.id,
      });

      service.inclusions = updateServiceDto.inclusions.map(
        (inclusion, index) =>
          this.inclusionRepository.create({
            service_id: service.id,
            title: inclusion.title,
            sort_order: inclusion.sort_order ?? index,
          }),
      );
    }

    return this.serviceRepository.save(service);
  }

  async deactivate(id: number): Promise<{ message: string }> {
    const service = await this.serviceRepository.findOne({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!service.is_active) {
      throw new BadRequestException('Service is already inactive');
    }

    service.is_active = false;

    await this.serviceRepository.save(service);

    return {
      message: 'Service deactivated successfully',
    };
  }

  // ==============================
  // SERVICE CATEGORY METHODS
  // ==============================

  async findAllCategories(): Promise<ServiceCategoryEntity[]> {
    return this.categoryRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async createCategory(
    createCategoryDto: CreateServiceCategoryDto,
  ): Promise<ServiceCategoryEntity> {
    const category = this.categoryRepository.create(createCategoryDto);

    return this.categoryRepository.save(category);
  }

  async updateCategory(
    id: number,
    updateCategoryDto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryEntity> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Service category not found');
    }

    Object.assign(category, updateCategoryDto);

    return this.categoryRepository.save(category);
  }
}
