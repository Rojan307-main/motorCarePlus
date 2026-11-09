import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { PostgresDatabaseProviderModule } from "@/providers/database/postgres/provider.module";
import { AppController } from "@/src/app.controller";
import { AppService } from "@/src/app.service";
import global_config from "@/config/global_config";
import { UserModule } from "./modules/user/user.module";
import { VehicleModule } from "./modules/vehicle/vehicle.module";
import { ServiceCatalogModule } from "./modules/service-catalog/service-catalog.module";
import { BookingsModule } from "./modules/booking/booking.module";
import { CatalogueModule } from "./modules/catalogue/catalogue.module";
import { ProductModule } from "./modules/product/product.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: [global_config],
    }),

    PostgresDatabaseProviderModule,

    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT || 6379),
        ...(process.env.REDIS_PASSWORD
          ? { password: process.env.REDIS_PASSWORD }
          : {}),
      },
    }),

    UserModule,
    VehicleModule,
    ServiceCatalogModule,
    BookingsModule,
    CatalogueModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
