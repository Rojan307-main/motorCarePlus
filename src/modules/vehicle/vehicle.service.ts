import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { VehicleEntity } from './entities/vehicle.entity';
import { VehicleMakeEntity } from './entities/vehicle-make.entity';
import { VehicleModelEntity } from './entities/vehicle-model.entity';
import { CreateMakeDto, CreateModelDto, CreateVehicleDto, GetMakesQueryDto, GetModelsQueryDto, UpdateVehicleDto, } from './dto/vehicle.dto';
import { UserService } from '../user/user.service';
import { VehicleTypeEnum } from '../../common/enums/vehicle-type.enum';
import { RoleEnum } from '../../common/enums/role.enum';
import type { AuthUser } from '../auth/jwt.strategy';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(VehicleMakeEntity)
    private readonly makeRepository: Repository<VehicleMakeEntity>,
    @InjectRepository(VehicleModelEntity)
    private readonly modelRepository: Repository<VehicleModelEntity>,
    private readonly userService: UserService,
  ) {}

  private async getModelOrFail(model_id: string, type: VehicleTypeEnum) {
    const model = await this.modelRepository.findOne({
      where: { id: model_id },
      relations: { make: true },
    });
    if (!model) {
      throw new NotFoundException('Vehicle model not found');
    }
    if (model.make.vehicle_type !== type) {
      throw new BadRequestException('This model does not belong to the selected vehicle type');
    }
    return model;
  }

  private async assertRegistrationFree(registration_number: string, ignoreId?: string) {
    const found = await this.vehicleRepository.findOne({ where: { registration_number } });
    if (found && found.id !== ignoreId) {
      throw new ConflictException('This registration number is already saved');
    }
  }

  private assertOwnerOrAdmin(vehicle: VehicleEntity, user: AuthUser) {
    if (user.role !== RoleEnum.ADMIN && vehicle.user_id !== user.user_id) {
      throw new ForbiddenException('You can only access your own vehicles');
    }
  }

  async create(user_id: string, createVehicleDto: CreateVehicleDto): Promise<VehicleEntity> {
    await this.userService.findOne(user_id);
    await this.getModelOrFail(createVehicleDto.model_id, createVehicleDto.type);

    const registration_number = createVehicleDto.registration_number.trim().toUpperCase();
    await this.assertRegistrationFree(registration_number);

    const saved = await this.vehicleRepository.save(
      this.vehicleRepository.create({
        user_id,
        model_id: createVehicleDto.model_id,
        type: createVehicleDto.type,
        year: createVehicleDto.year ?? null,
        registration_number,
      }),
    );
    return this.findOne(saved.id);
  }

  async findAll(query: FindManyOptions<VehicleEntity>, user: AuthUser) {
    if (user.role !== RoleEnum.ADMIN) {
      const where = query.where;
      query = {
        ...query,
        where: Array.isArray(where) && where.length
          ? where.map((w) => ({ ...w, user_id: user.user_id }))
          : { ...(Array.isArray(where) ? {} : where), user_id: user.user_id },
      };
    }

    const [data, total] = await this.vehicleRepository.findAndCount({
      order: { created_at: 'DESC' },
      take: 10,
      ...query,
      select: undefined,
      relations: { model: { make: true } },
    });
    return { data, total };
  }

  async findOne(id: string, user?: AuthUser): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id },
      relations: { model: { make: true } },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    if (user) {
      this.assertOwnerOrAdmin(vehicle, user);
    }
    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto, user: AuthUser): Promise<VehicleEntity> {
    const vehicle = await this.findOne(id, user);
    const changes: Partial<Pick<VehicleEntity, 'model_id' | 'year' | 'registration_number'>> = {};

    if (updateVehicleDto.model_id) {
      await this.getModelOrFail(updateVehicleDto.model_id, vehicle.type);
      changes.model_id = updateVehicleDto.model_id;
    }
    if (updateVehicleDto.registration_number) {
      const registration_number = updateVehicleDto.registration_number.trim().toUpperCase();
      await this.assertRegistrationFree(registration_number, id);
      changes.registration_number = registration_number;
    }
    if (updateVehicleDto.year !== undefined) {
      changes.year = updateVehicleDto.year;
    }

    if (Object.keys(changes).length > 0) {
      await this.vehicleRepository.update(id, changes);
    }
    return this.findOne(id);
  }

  async remove(id: string, user: AuthUser) {
    const vehicle = await this.findOne(id, user);
    await this.vehicleRepository.remove(vehicle);
    return { message: 'Vehicle deleted' };
  }

  findAllMakes(query: GetMakesQueryDto) {
    return this.makeRepository.find({
      where: query.type ? { vehicle_type: query.type } : {},
      order: { name: 'ASC' },
    });
  }

  findAllModels(query: GetModelsQueryDto) {
    return this.modelRepository.find({
      where: query.make_id ? { make_id: query.make_id } : {},
      relations: { make: true },
      order: { name: 'ASC' },
    });
  }

  async createMake(createMakeDto: CreateMakeDto) {
    const name = createMakeDto.name.trim();
    const existing = await this.makeRepository.findOne({
      where: { name, vehicle_type: createMakeDto.vehicle_type },
    });
    if (existing) {
      throw new ConflictException('This make already exists for this vehicle type');
    }

    const make = await this.makeRepository.save(
      this.makeRepository.create({ name, vehicle_type: createMakeDto.vehicle_type }),
    );

    if (createMakeDto.models?.length) {
      await this.modelRepository.save(createMakeDto.models.map((model) =>
          this.modelRepository.create({ make_id: make.id, name: model.trim() }),
        ),
      );
    }

    return this.makeRepository.findOne({
      where: { id: make.id },
      relations: { models: true },
    });
  }

  async createModel(createModelDto: CreateModelDto) {
    const make = await this.makeRepository.findOne({ where: { id: createModelDto.make_id } });
    if (!make) {
      throw new NotFoundException('Vehicle make not found');
    }

    const name = createModelDto.name.trim();
    const existing = await this.modelRepository.findOne({
      where: { make_id: createModelDto.make_id, name },
    });
    if (existing) {
      throw new ConflictException('This model already exists for this make');
    }

    return this.modelRepository.save(
      this.modelRepository.create({ make_id: createModelDto.make_id, name }),
    );
  }
}