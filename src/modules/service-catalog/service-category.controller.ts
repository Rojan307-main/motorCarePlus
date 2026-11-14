import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServiceCatalogService } from './service-catalog.service';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/service-catalog.dto';
import { RolesGuard } from '@/src/common/guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

@Controller('service-categories')
export class ServiceCategoryController {
  constructor(
    private readonly serviceCatalogService: ServiceCatalogService,
  ) {}


  @Get()
  findAll() {
    return this.serviceCatalogService.findAllCategories();
  }


  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  create(@Body() createCategoryDto: CreateServiceCategoryDto) {
    return this.serviceCatalogService.createCategory(createCategoryDto);
  }


  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateServiceCategoryDto,
  ) {
    return this.serviceCatalogService.updateCategory(id, updateCategoryDto);
  }
}
