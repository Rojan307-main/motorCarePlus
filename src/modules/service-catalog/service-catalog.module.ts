
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceEntity } from './entities/service.entity';
import { ServiceCategoryEntity } from './entities/service-category.entity';
import { ServiceInclusionEntity } from './entities/service-inclusion.entity';

import { ServiceCatalogService } from './service-catalog.service';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCategoryController } from './service-category.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceEntity,
      ServiceCategoryEntity,
      ServiceInclusionEntity,
    ]),
  ],
  controllers: [
    ServiceCatalogController,
    ServiceCategoryController,
  ],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
