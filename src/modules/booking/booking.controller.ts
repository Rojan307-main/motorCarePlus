import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../auth/jwt.strategy';
import { BookingsService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingSlotsDto } from './dto/booking-slots.dto';
import { BookingEntity } from './entities/booking.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService) {}


  @Post()
  create(@Body() createBookingDto: CreateBookingDto, @Req() req: { user: AuthUser },): Promise<BookingEntity> {
    return this.bookingsService.create(
      createBookingDto,
      req.user,
    );
  }

  @Get('slots')
  getAvailableSlots(@Query() query: BookingSlotsDto,): Promise<string[]> {
    return this.bookingsService.getAvailableSlots(
      query.service_id,
      query.date,
      query.vehicle_type,
    );
  }


  @Get()
  findAll(@Req() req: { user: AuthUser }): Promise<BookingEntity[]> {
    return this.bookingsService.findAll(req.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthUser }): Promise<BookingEntity> {
    return this.bookingsService.findOne(id, req.user);
  }


  @Put(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, 
  @Body() updateBookingStatusDto: UpdateBookingStatusDto,@Req() req: { user: AuthUser },): Promise<BookingEntity> {
    return this.bookingsService.updateStatus(
      id,
      updateBookingStatusDto,
      req.user,
    );
  }
}
