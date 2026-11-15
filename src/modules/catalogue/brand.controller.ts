import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogueService } from './catalogue.service';
import { CreateBrandDto, GetBrandsQueryDto, UpdateBrandDto } from './dto/catalogue.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guard';
import { RoleEnum } from '../../common/enums/role.enum';

@Controller('catalogue/brands')
export class BrandController {
  constructor(private readonly catalogueService: CatalogueService) {}

  // public: the website shows brands before login
  // GET /catalogue/brands?q=bosch
  @Get()
  findAll(@Query() query: GetBrandsQueryDto) {
    return this.catalogueService.findAllBrands(query);
  }

  // admin only
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.catalogueService.createBrand(createBrandDto);
  }

  // admin only
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.catalogueService.updateBrand(id, updateBrandDto);
  }
}