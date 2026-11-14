import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceEntity } from './entities/service.entity';
import { ServiceCategoryEntity } from './entities/service-category.entity';
import { ServiceInclusionEntity } from './entities/service-inclusion.entity';
import { ServiceCatalogService } from './service-catalog.service';
import { ServiceCategoryController } from './service-category.controller';
import { ServiceCatalogController } from './service-catalog.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceEntity,
      ServiceCategoryEntity,
      ServiceInclusionEntity,
    ]),
  ],

  controllers: [ServiceCategoryController, ServiceCatalogController ],
  providers: [ ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
