import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtGuard } from '../../common/guard';
import { isAdminUser } from '../../common/helpers/admin.helper';
import type { AuthUser } from '../auth/jwt.strategy';
import { ProductService } from './product.service';
import { GetProductQueryDto, ListProductsQueryDto } from './dto/product.dto';
import { ProductTypeEnum } from '../../common/enums/product-type.enum';

@Controller('decorations')
export class DecorationController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  findAll(@Query() query: ListProductsQueryDto, @Req() req: { user?: AuthUser | null }) {
    return this.productService.findAll({ ...query, include_inactive: isAdminUser(req.user) && query.include_inactive === true, product_type: ProductTypeEnum.DECORATION });
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetProductQueryDto,
    @Req() req: { user?: AuthUser | null },
  ) {
    const includeInactive = isAdminUser(req.user) && query.include_inactive === true;
    return this.productService.findOne(id, includeInactive, ProductTypeEnum.DECORATION);
  }
}