import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { BookingEntity } from './entities/booking.entity';
import { ServiceEntity } from '../service-catalog/entities/service.entity';
import { VehicleEntity } from '../vehicle/entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, ServiceEntity,VehicleEntity]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}