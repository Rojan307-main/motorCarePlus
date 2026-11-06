
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { BookingsService } from './booking.service';

import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingSlotsDto } from './dto/booking-slots.dto';

import { BookingEntity } from './entities/booking.entity';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
  ) {}

  // POST /bookings
  @Post()
  create(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingEntity> {
    return this.bookingsService.create(createBookingDto);
  }

  // GET /bookings/slots?service_id=1&date=2026-11-10
  @Get('slots')
  getAvailableSlots(
    @Query() query: BookingSlotsDto,
  ): Promise<string[]> {
    return this.bookingsService.getAvailableSlots(
      query.service_id,
      query.date,
    );
  }

  // GET /bookings
  @Get()
  findAll(): Promise<BookingEntity[]> {
    return this.bookingsService.findAll();
  }

  // GET /bookings/:id
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BookingEntity> {
    return this.bookingsService.findOne(id);
  }

  // PUT /bookings/:id/status
  @Put(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ): Promise<BookingEntity> {
    return this.bookingsService.updateStatus(
      id,
      updateBookingStatusDto,
    );
  }
}
