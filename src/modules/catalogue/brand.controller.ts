import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { CreateBrandDto, GetBrandsQueryDto, UpdateBrandDto } from './dto/catalogue.dto';

@Controller('catalogue/brands')
export class BrandController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get()
  findAll(@Query() query: GetBrandsQueryDto) {
    return this.catalogueService.findAllBrands(query);
  }

  @Post()
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.catalogueService.createBrand(createBrandDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBrandDto: UpdateBrandDto) {
    return this.catalogueService.updateBrand(id, updateBrandDto);
  }
}
