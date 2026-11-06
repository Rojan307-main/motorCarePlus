import { IsDateString, IsEnum, IsInt, IsUUID, Matches, Min } from 'class-validator';
import { VehicleTypeEnum } from '../../../common/enums/vehicle-type.enum';

export class CreateBookingDto {
  @IsUUID()
  user_id!: string;

  @IsInt()
  @Min(1)
  service_id!: number;

  @IsUUID()
  vehicle_id!: string;

  @IsEnum(VehicleTypeEnum)
  vehicle_type!: VehicleTypeEnum;

  @IsDateString()
  booking_date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time!: string;
}
