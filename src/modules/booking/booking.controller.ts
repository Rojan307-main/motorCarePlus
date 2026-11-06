import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
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

  @Post()
  create(@Body() createBookingDto: CreateBookingDto,): Promise<BookingEntity> {
    return this.bookingsService.create(createBookingDto);
  }

  @Get('slots')
  getAvailableSlots(@Query() query: BookingSlotsDto,): Promise<string[]> {
    return this.bookingsService.getAvailableSlots(
      query.service_id,
      query.date,
    );
  }

  @Get()
  findAll(): Promise<BookingEntity[]> {
    return this.bookingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number,): Promise<BookingEntity> {
    return this.bookingsService.findOne(id);
  }

  @Put(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number,@Body() updateBookingStatusDto: UpdateBookingStatusDto): Promise<BookingEntity> {
    return this.bookingsService.updateStatus(
      id, updateBookingStatusDto);
  }
}
