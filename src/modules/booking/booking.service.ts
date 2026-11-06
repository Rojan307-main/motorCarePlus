
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  BookingEntity,
  BookingStatusEnum,
} from './entities/booking.entity';

import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

import { ServiceEntity } from '../service-catalog/entities/service.entity';
import { VehicleEntity } from '../vehicle/entities/vehicle.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
  ) {}


  public async create(dto: CreateBookingDto): Promise<BookingEntity> {
    if (!['car', 'bike'].includes(dto.vehicle_type)) {
      throw new BadRequestException(
        'Vehicle type must be car or bike',
      );
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dto.start_time)) {
      throw new BadRequestException(
        'Invalid start time. Use HH:mm format',
      );
    }

    const service = await this.serviceRepository.findOne({where: {id: dto.service_id, is_active: true},});

    if (!service) {
      throw new NotFoundException(
        'Active service not found',
      );
    }

    const vehicle = await this.vehicleRepository.findOne({where: {id: dto.vehicle_id,},});

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (service.vehicle_type !== 'both' && service.vehicle_type !== dto.vehicle_type) {
      throw new BadRequestException(
        'Selected service is not available for this vehicle type',
      );
    }

    const [hours, minutes] = dto.start_time
      .split(':')
      .map(Number);

    const startMinutes = hours * 60 + minutes;

    const endMinutes = startMinutes + service.duration_minutes;

    if (endMinutes > 24 * 60) {
      throw new BadRequestException(
        'Booking cannot extend beyond midnight',
      );
    }

    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    const endTime = `${String(endHours).padStart(2, '0')}:` + `${String(endMins).padStart(2, '0')}`;

    const overlappingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.booking_date = :bookingDate', {
        bookingDate: dto.booking_date,
      })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [
          BookingStatusEnum.PENDING,
          BookingStatusEnum.CONFIRMED,
        ],
      })
      .andWhere('booking.start_time < :endTime', {
        endTime,
      })
      .andWhere('booking.end_time > :startTime', {
        startTime: dto.start_time,
      })
      .getOne();

    if (overlappingBooking) {
      throw new BadRequestException(
        'The selected time slot is already booked',
      );
    }

    const booking = this.bookingRepository.create({
      ...dto,
      end_time: endTime,
      status: BookingStatusEnum.PENDING,
    });

    return this.bookingRepository.save(booking);
  }

  async findAll(): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      relations: ['user', 'vehicle', 'service'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'vehicle', 'service'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateStatus(id: number, dto: UpdateBookingStatusDto): Promise<BookingEntity> {

    const booking = await this.findOne(id);
    booking.status = dto.status;
    return this.bookingRepository.save(booking);
  }

  async getAvailableSlots(serviceId: number, date: string): Promise<string[]> {

    const service = await this.serviceRepository.findOne({where: {id: serviceId, is_active: true}});

    if (!service) {
      throw new NotFoundException(
        'Active service not found',
      );
    }

    const existingBookings = await this.bookingRepository.find({
      where: {
        booking_date: date,
        status: In([
          BookingStatusEnum.PENDING,
          BookingStatusEnum.CONFIRMED,
        ]),
      },
      select: ['start_time', 'end_time'],
    });

    const slots: string[] = [];

    const openingTime = 9 * 60;
    const closingTime = 18 * 60;
    const slotInterval = 30;

    for (
      let start = openingTime;
      start + service.duration_minutes <= closingTime;
      start += slotInterval
    ) {
      const end = start + service.duration_minutes;

      const startTime =
        `${String(Math.floor(start / 60)).padStart(2, '0')}:` +
        `${String(start % 60).padStart(2, '0')}`;

      const endTime =
        `${String(Math.floor(end / 60)).padStart(2, '0')}:` +
        `${String(end % 60).padStart(2, '0')}`;

      const isBooked = existingBookings.some((booking) => {
        return (
          booking.start_time < endTime &&
          booking.end_time > startTime
        );
      });

      if (!isBooked) {
        slots.push(startTime);
      }
    }

    return slots;
  }
}
