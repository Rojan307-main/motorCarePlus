import {IsDateString,
  IsInt,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class BookingSlotsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  service_id!: number;

  @IsDateString()
  date!: string;
}