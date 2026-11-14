import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, Min, } from 'class-validator';

export class BookingSlotsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  service_id!: number;

  @IsDateString()
  date!: string;

  @IsIn(['car', 'bike'])
  vehicle_type!: 'car' | 'bike';
}
