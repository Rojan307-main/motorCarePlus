import {Body,Controller,Delete,Get,Param,ParseIntPipe,Patch, Post,Put, Query, UploadedFile, UseInterceptors} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import {CreateProductDto,GetProductQueryDto,ListProductsQueryDto,SetCompatibilityDto,UpdateProductDto } from './dto/product.dto';

const productPhotoMulterOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productService.findAll(query);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Post('bulk')
  createBulk(@Body() products: unknown) {
    return this.productService.createBulk(products);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetProductQueryDto,
  ) {
    return this.productService.findOne(id, query.include_inactive ?? false);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  // deactivates (is_active = false); the product is never deleted
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deactivate(id);
  }

  @Put(':id/compatibility')
  setCompatibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() setCompatibilityDto: SetCompatibilityDto,
  ) {
    return this.productService.setCompatibility(id, setCompatibilityDto);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', productPhotoMulterOptions))
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Parameters<ProductService['updatePhoto']>[1],
  ) {
    return this.productService.updatePhoto(id, file);
  }
}
