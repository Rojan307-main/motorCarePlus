import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from './entities/category.entity';
import { BrandEntity } from './entities/brand.entity';
import { CatalogueService } from './catalogue.service';
import { CategoryController } from './category.controller';
import { BrandController } from './brand.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, BrandEntity])],
  controllers: [CategoryController, BrandController],
  providers: [CatalogueService],
  exports: [CatalogueService, TypeOrmModule],
})
export class CatalogueModule {}
