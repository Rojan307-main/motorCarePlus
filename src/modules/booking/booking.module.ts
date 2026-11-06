import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingsService } from './booking.service';

import { BookingEntity } from './entities/booking.entity';
import { ServiceEntity } from '../service-catalog/entities/service.entity';
import { VehicleEntity } from '../vehicle/entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      ServiceEntity,
      VehicleEntity,
    ]),
  ],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}