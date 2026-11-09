import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  GetProductQueryDto,
  ListProductsQueryDto,
  SetCompatibilityDto,
  UpdateProductDto,
} from './dto/product.dto';
import { productPhotoMulterOptions } from '../../providers/storage/local/multer.options';

// TODO (after auth): create, bulk, update, deactivate, compatibility and photo are admin only
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // GET /products?product_type=part&vehicle_type=car&min_price=500&max_price=3000
  //     &fits_model_id=<uuid>&q=brake&sort_by=price&sort_order=asc&limit=20&offset=0
  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productService.findAll(query);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  // body is a plain JSON array: [ { ...product }, { ...product } ] (up to 1000 items)
  // all-or-nothing: if any item is wrong, nothing is saved and every problem is listed with its index
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

  // multipart/form-data, field name "file": jpeg, png or webp, max 2 MB
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', productPhotoMulterOptions))
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productService.updatePhoto(id, file);
  }
}
