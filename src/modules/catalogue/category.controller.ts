import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { CreateCategoryDto, GetCategoriesQueryDto, UpdateCategoryDto } from './dto/catalogue.dto';

@Controller('catalogue/categories')
export class CategoryController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get()
  findAll(@Query() query: GetCategoriesQueryDto) {
    return this.catalogueService.findAllCategories(query);
  }

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.catalogueService.createCategory(createCategoryDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.catalogueService.updateCategory(id, updateCategoryDto);
  }
}
