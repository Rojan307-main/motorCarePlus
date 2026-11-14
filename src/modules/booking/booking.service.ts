import { BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BookingEntity, BookingStatusEnum} from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ServiceEntity } from '../service-catalog/entities/service.entity';
import { VehicleEntity } from '../vehicle/entities/vehicle.entity';
import type { AuthUser } from '../auth/jwt.strategy';
import { RoleEnum } from '../../common/enums/role.enum';

const BAYS_PER_TYPE = 2;
const SLOT_INTERVAL = 30;

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private isAdmin(user: AuthUser): boolean {
    return user.role === RoleEnum.ADMIN;
  }

  private isActiveStatus(status: BookingStatusEnum): boolean {
    return [
      BookingStatusEnum.PENDING,
      BookingStatusEnum.CONFIRMED,
    ].includes(status);
  }

  private getToday(): string {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return (
      `${String(hours).padStart(2, '0')}:` +
      `${String(mins).padStart(2, '0')}`
    );
  }

  private validateBookingDateAndTime(
    bookingDate: string,
    startTime: string,
  ): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      throw new BadRequestException('Invalid booking date');
    }

    const parsedDate = new Date(`${bookingDate}T00:00:00`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== bookingDate
    ) {
      throw new BadRequestException('Invalid booking date');
    }

    if (bookingDate < this.getToday()) {
      throw new BadRequestException(
        'Booking date cannot be in the past',
      );
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      throw new BadRequestException(
        'Invalid start time. Use HH:mm format',
      );
    }

    const startMinutes = this.timeToMinutes(startTime);

    if (startMinutes < 9 * 60 || startMinutes >= 18 * 60) {
      throw new BadRequestException(
        'Booking time must be between 09:00 and 18:00',
      );
    }

    if (
      bookingDate === this.getToday() &&
      startMinutes <= this.timeToMinutes(
        `${String(new Date().getHours()).padStart(2, '0')}:` +
        `${String(new Date().getMinutes()).padStart(2, '0')}`,
      )
    ) {
      throw new BadRequestException(
        'Booking time has already passed',
      );
    }
  }

  private async assertOwnerOrAdmin(booking: BookingEntity, user: AuthUser): Promise<void> {
    if (
      !this.isAdmin(user) &&
      booking.user_id !== user.user_id
    ) {
      throw new ForbiddenException(
        'You are not allowed to access this booking',
      );
    }
  }


  async create(dto: CreateBookingDto, user: AuthUser): Promise<BookingEntity> {
    this.validateBookingDateAndTime(
      dto.booking_date,
      dto.start_time,
    );

    const service = await this.serviceRepository.findOne({
      where: {
        id: dto.service_id,
        is_active: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Active service not found');
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: {
        id: dto.vehicle_id,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (
      !this.isAdmin(user) &&
      vehicle.user_id !== user.user_id
    ) {
      throw new ForbiddenException(
        'You cannot book a service for another user vehicle',
      );
    }


    const vehicleType = vehicle.type;

    if (!['car', 'bike'].includes(vehicleType)) {
      throw new BadRequestException(
        'Vehicle type must be car or bike',
      );
    }

    if (
      service.vehicle_type !== 'both' &&
      service.vehicle_type !== vehicleType
    ) {
      throw new BadRequestException(
        'Selected service is not available for this vehicle type',
      );
    }

    const startMinutes = this.timeToMinutes(dto.start_time);
    const endMinutes = startMinutes + service.duration_minutes;

    if (endMinutes > 18 * 60) {
      throw new BadRequestException(
        'Booking must finish by 18:00',
      );
    }

    const endTime = this.minutesToTime(endMinutes);

    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`${dto.booking_date}:${vehicleType}`],
      );

      const bookingRepo = manager.getRepository(BookingEntity);

    
      const sameVehicleBooking = await bookingRepo
        .createQueryBuilder('booking')
        .where('booking.booking_date = :date', {
          date: dto.booking_date,
        })
        .andWhere('booking.vehicle_id = :vehicleId', {
          vehicleId: dto.vehicle_id,
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

      if (sameVehicleBooking) {
        throw new BadRequestException('This vehicle already has an overlapping booking');
      }

   
      for (
        let step = startMinutes;
        step < endMinutes;
        step += SLOT_INTERVAL
      ) {
        const stepEnd = Math.min(
          step + SLOT_INTERVAL,
          endMinutes,
        );

        const overlappingCount = await bookingRepo
          .createQueryBuilder('booking')
          .where('booking.booking_date = :date', {
            date: dto.booking_date,
          })
          .andWhere('booking.vehicle_type = :type', {
            type: vehicleType,
          })
          .andWhere('booking.status IN (:...statuses)', {
            statuses: [
              BookingStatusEnum.PENDING,
              BookingStatusEnum.CONFIRMED,
            ],
          })
          .andWhere('booking.start_time < :stepEnd', {
            stepEnd: this.minutesToTime(stepEnd),
          })
          .andWhere('booking.end_time > :stepStart', {
            stepStart: this.minutesToTime(step),
          })
          .getCount();

        if (overlappingCount >= BAYS_PER_TYPE) {
          throw new BadRequestException(
            'No free bay at the selected time',
          );
        }
      }

      const booking = bookingRepo.create({
        ...dto,
        user_id: user.user_id,
        vehicle_type: vehicleType,
        end_time: endTime,
        status: BookingStatusEnum.PENDING,
      });

      return bookingRepo.save(booking);
    });
  }


  async findAll(user: AuthUser): Promise<BookingEntity[]> {
    const where = this.isAdmin(user)
      ? {}
      : { user_id: user.user_id };

    return this.bookingRepository.find({
      where,
      relations: ['user', 'vehicle', 'service'],
      order: {
        created_at: 'DESC',
      },
    });
  }


  async findOne( id: number, user: AuthUser ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'vehicle', 'service'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.assertOwnerOrAdmin(booking, user);

    return booking;
  }


  async updateStatus( id: number, dto: UpdateBookingStatusDto, user: AuthUser): Promise<BookingEntity> {
    const booking = await this.findOne(id, user);

    if (!this.isAdmin(user)) {
      if (
        dto.status !== BookingStatusEnum.CANCELLED ||
        ![
          BookingStatusEnum.PENDING,
          BookingStatusEnum.CONFIRMED,
        ].includes(booking.status)
      ) {
        throw new ForbiddenException('You can only cancel your own pending or confirmed booking');
      }
    }

    const allowedTransitions: Record<string, BookingStatusEnum[]> = {
      [BookingStatusEnum.PENDING]: [
        BookingStatusEnum.CONFIRMED,
        BookingStatusEnum.CANCELLED,
      ],
      [BookingStatusEnum.CONFIRMED]: [
        BookingStatusEnum.COMPLETED,
        BookingStatusEnum.CANCELLED,
      ],
      [BookingStatusEnum.COMPLETED]: [],
      [BookingStatusEnum.CANCELLED]: [],
    };

    const allowedStatuses = allowedTransitions[booking.status] ?? [];

    if (!allowedStatuses.includes(dto.status)) {
      throw new BadRequestException(`Cannot change booking status from ${booking.status} to ${dto.status}`);
    }
    booking.status = dto.status;
    return this.bookingRepository.save(booking);
  }


  async getAvailableSlots( serviceId: number, date: string, vehicleType: string): Promise<string[]> {
    if (!['car', 'bike'].includes(vehicleType)) {
      throw new BadRequestException(
        'Vehicle type must be car or bike',
      );
    }

    const service = await this.serviceRepository.findOne({
      where: {
        id: serviceId,
        is_active: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Active service not found');
    }

    if (
      service.vehicle_type !== 'both' &&
      service.vehicle_type !== vehicleType
    ) {
      throw new BadRequestException(
        'Selected service is not available for this vehicle type',
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid booking date');
    }

    if (date < this.getToday()) {
      throw new BadRequestException(
        'Booking date cannot be in the past',
      );
    }

    const existingBookings = await this.bookingRepository.find({
      where: {
        booking_date: date,
        vehicle_type: vehicleType as any,
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

    for (
      let start = openingTime;
      start + service.duration_minutes <= closingTime;
      start += SLOT_INTERVAL
    ) {
      const end = start + service.duration_minutes;

      const startTime = this.minutesToTime(start);
      const endTime = this.minutesToTime(end);

      if (
        date === this.getToday() &&
        start <= this.timeToMinutes(
          `${String(new Date().getHours()).padStart(2, '0')}:` +
          `${String(new Date().getMinutes()).padStart(2, '0')}`,
        )
      ) {
        continue;
      }

      let hasFreeBay = true;

      for (
        let step = start;
        step < end;
        step += SLOT_INTERVAL
      ) {
        const stepEnd = Math.min(
          step + SLOT_INTERVAL,
          end,
        );

        const overlappingCount = existingBookings.filter((booking) => {
            const bookingStart = booking.start_time.slice(0, 5);
            const bookingEnd = booking.end_time.slice(0, 5);
            return (
              bookingStart < this.minutesToTime(stepEnd) &&
              bookingEnd > this.minutesToTime(step)
            );
          },
        ).length;

        if (overlappingCount >= BAYS_PER_TYPE) {
          hasFreeBay = false;
          break;
        }
      }

      if (hasFreeBay) {
        slots.push(startTime);
      }
    }

    return slots;
  }
}
