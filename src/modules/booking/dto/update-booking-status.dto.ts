import { IsEnum } from 'class-validator';
import { BookingStatusEnum } from '../entities/booking.entity';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatusEnum)
  status!: BookingStatusEnum;
}
