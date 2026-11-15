import { Controller, Get, Post, Put, Body, Param, Delete, Query, ParseUUIDPipe,  Req, UseGuards, } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FindManyOptions } from 'typeorm';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { QueryParserPipe } from '../../common/pipes/QueryParserPipe';
import { VehicleEntity } from './entities/vehicle.entity';
import type { AuthUser } from '../auth/jwt.strategy';

@UseGuards(AuthGuard('jwt'))
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @Req() req: { user: AuthUser }) {
    return this.vehicleService.create(req.user.user_id, createVehicleDto);
  }

  // GET /vehicles?type=car&limit=10&offset=0
  @Get()
  findAll(
    @Query(new QueryParserPipe('MANY', ['registration_number']))
    query: FindManyOptions<VehicleEntity>,
    @Req() req: { user: AuthUser },) {
    return this.vehicleService.findAll(query, req.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthUser },) {
    return this.vehicleService.findOne(id, req.user);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Req() req: { user: AuthUser },) {
    return this.vehicleService.update(id, updateVehicleDto, req.user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthUser },) {
    return this.vehicleService.remove(id, req.user);
  }
}