import {
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class BookingSlotsDto {
  @IsInt()
  @Min(1)
  service_id!: number;

  @IsDateString()
  date!: string;
}