import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogueService } from './catalogue.service';
import { CreateCategoryDto, GetCategoriesQueryDto, UpdateCategoryDto } from './dto/catalogue.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guard';
import { RoleEnum } from '../../common/enums/role.enum';

@Controller('catalogue/categories')
export class CategoryController {
  constructor(private readonly catalogueService: CatalogueService) {}

  // public: the website shows categories before login
  // GET /catalogue/categories?product_type=part&parent_id=3
  @Get()
  findAll(@Query() query: GetCategoriesQueryDto) {
    return this.catalogueService.findAllCategories(query);
  }

  // admin only
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.catalogueService.createCategory(createCategoryDto);
  }

  // admin only
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.catalogueService.updateCategory(id, updateCategoryDto);
  }
}