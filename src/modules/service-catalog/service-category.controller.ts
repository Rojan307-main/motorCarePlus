
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ServiceCatalogService } from './service-catalog.service';

import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto/service-catalog.dto';

@Controller('service-categories')
export class ServiceCategoryController {
  constructor(
    private readonly serviceCatalogService: ServiceCatalogService,
  ) {}

  // GET /service-categories
  @Get()
  findAll() {
    return this.serviceCatalogService.findAllCategories();
  }

  // POST /service-categories
  @Post()
  create(
    @Body() createCategoryDto: CreateServiceCategoryDto,
  ) {
    return this.serviceCatalogService.createCategory(
      createCategoryDto,
    );
  }

  // PATCH /service-categories/:id
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateServiceCategoryDto,
  ) {
    return this.serviceCatalogService.updateCategory(
      id,
      updateCategoryDto,
    );
  }
}
