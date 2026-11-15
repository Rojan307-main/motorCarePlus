import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogueService } from './catalogue.service';
import { CreateCategoryDto, GetCategoriesQueryDto, UpdateCategoryDto } from './dto/catalogue.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { OptionalJwtGuard, RolesGuard } from '../../common/guard';
import { RoleEnum } from '../../common/enums/role.enum';
import { isAdminUser } from '../../common/helpers/admin.helper';

@Controller('catalogue/categories')
export class CategoryController {
  constructor(private readonly catalogueService: CatalogueService) {}


  @Get()
  @UseGuards(OptionalJwtGuard)
  findAll(
    @Query() query: GetCategoriesQueryDto,
    @Req() req: { user?: { roles?: string[] } | null },
  ) {
    const includeInactive = isAdminUser(req.user) && query.include_inactive === true;
    return this.catalogueService.findAllCategories({ ...query, include_inactive: includeInactive });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.catalogueService.createCategory(createCategoryDto);
  }

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