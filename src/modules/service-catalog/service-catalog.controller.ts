import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ServiceCatalogService } from './service-catalog.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service-catalog.dto';
import { VehicleTypeEnum } from '../../common/enums/vehicle-type.enum';

@Controller('services')
export class ServiceCatalogController {
  constructor(
    private readonly serviceCatalogService: ServiceCatalogService,
  ) {}

  @Get()
  findAll(@Query('category_id', new ParseIntPipe({ optional: true }))
    categoryId?: number,

    @Query('vehicle_type', new ParseEnumPipe(VehicleTypeEnum, { optional: true }),)
    vehicleType?: VehicleTypeEnum,

    @Query('search')
    search?: string,
  ) {
    return this.serviceCatalogService.findAll(categoryId, vehicleType, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceCatalogService.findOne(id);
  }

  @Post()
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.serviceCatalogService.create(createServiceDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.serviceCatalogService.update(id, updateServiceDto);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.serviceCatalogService.deactivate(id);
  }
}
