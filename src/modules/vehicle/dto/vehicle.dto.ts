import { ArrayUnique, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, } from 'class-validator';
import { VehicleTypeEnum } from '../../../common/enums/vehicle-type.enum';

export class CreateVehicleDto {
  @IsIn([VehicleTypeEnum.CAR, VehicleTypeEnum.BIKE], {
    message: 'Vehicle type must be either car or bike',
  })
  type!: VehicleTypeEnum;

  @IsUUID()
  model_id!: string;

  @IsOptional()
  @IsInt({ message: 'Year must be a valid integer' })
  @Min(1980)
  @Max(2100)
  year?: number;

  @IsString()
  @IsNotEmpty({ message: 'Registration number cannot be empty' })
  registration_number!: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsUUID()
  model_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  registration_number?: string;
}

export class GetMakesQueryDto {
  @IsOptional()
  @IsIn([VehicleTypeEnum.CAR, VehicleTypeEnum.BIKE])
  type?: VehicleTypeEnum;
}

export class GetModelsQueryDto {
  @IsOptional()
  @IsUUID()
  make_id?: string;
}

export class CreateMakeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn([VehicleTypeEnum.CAR, VehicleTypeEnum.BIKE])
  vehicle_type!: VehicleTypeEnum;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  models?: string[];
}

export class CreateModelDto {
  @IsUUID()
  make_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}