import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { GetProductQueryDto, ListProductsQueryDto } from './dto/product.dto';
import { ProductTypeEnum } from '../../common/enums/product-type.enum';

@Controller('parts')
export class PartController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productService.findAll({ ...query, product_type: ProductTypeEnum.PART });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetProductQueryDto,
  ) {
    return this.productService.findOne(id, query.include_inactive ?? false, ProductTypeEnum.PART);
  }
}
