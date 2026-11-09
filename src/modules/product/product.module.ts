import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PartController } from './part.controller';
import { DecorationController } from './decoration.controller';
import { ProductEntity } from './entities/product.entity';
import { ProductCompatibilityEntity } from './entities/product-compatibility.entity';
import { VehicleModelEntity } from '../vehicle/entities/vehicle-model.entity';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { StorageModule } from '../../providers/storage/local/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, ProductCompatibilityEntity, VehicleModelEntity]),
    CatalogueModule,
    StorageModule,
  ],
  controllers: [ProductController, PartController, DecorationController],
  providers: [ProductService],
  // cart and order modules will need to read products
  exports: [ProductService, TypeOrmModule],
})
export class ProductModule {}
