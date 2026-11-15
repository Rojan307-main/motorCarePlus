import { Body,Controller,Delete,Get,Param,ParseIntPipe,Patch,Post,Put, Query,UploadedFile,UseGuards,UseInterceptors} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from './product.service';
import { CreateProductDto,GetProductQueryDto,ListProductsQueryDto,SetCompatibilityDto,UpdateProductDto} from './dto/product.dto';
import { productPhotoMulterOptions } from '../../providers/storage/local/multer.options';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guard';
import { RoleEnum } from '../../common/enums/role.enum';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productService.findAll(query);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Post('bulk')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deactivate(id);
  }

  @Put(':id/compatibility')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  setCompatibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() setCompatibilityDto: SetCompatibilityDto,
  ) {
    return this.productService.setCompatibility(id, setCompatibilityDto);
  }

  @Post(':id/photo')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @UseInterceptors(FileInterceptor('file', productPhotoMulterOptions))
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productService.updatePhoto(id, file);
  }
}