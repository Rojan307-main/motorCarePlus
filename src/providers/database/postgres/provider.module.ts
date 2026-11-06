
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { dataSourceOptions } from "@/config/database.config";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      retryAttempts: 5,
      retryDelay: 3000,
    }),
  ],
})
export class PostgresDatabaseProviderModule {}
