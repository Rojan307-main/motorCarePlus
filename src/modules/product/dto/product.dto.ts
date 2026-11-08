import { Transform, Type } from 'class-transformer';
import {ArrayMaxSize,ArrayUnique,IsArray,IsBoolean,IsEnum,IsInt,IsNotEmpty,IsNumber,IsOptional,IsString,IsUUID,Max,MaxLength,Min} from 'class-validator';
import { ProductTypeEnum } from '../../../common/enums/product-type.enum';
import { VehicleTypeEnum } from '../../../common/enums/vehicle-type.enum';

const MAX_PAGE_LIMIT = 100;

const MAX_PRICE = 99999999.99; // decimal(10,2)

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeSku = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' || value === true ? true : value === 'false' || value === false ? false : value;

export const PRODUCT_SORT_FIELDS = ['name', 'price', 'created_at', 'stock'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];



export class CreateProductDto {
  @IsInt()
  @Min(1)
  category_id!: number;

  @IsInt()
  @Min(1)
  brand_id!: number;

  @IsEnum(ProductTypeEnum, { message: 'product_type must be part or decoration' })
  product_type!: ProductTypeEnum;

  @IsEnum(VehicleTypeEnum, { message: 'vehicle_type must be car, bike or both' })
  vehicle_type!: VehicleTypeEnum;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @Transform(normalizeSku)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRICE)
  price!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRICE)
  market_price?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'stock cannot be below 0' })
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  model_ids?: string[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  category_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  brand_id?: number;

  @IsOptional()
  @IsEnum(ProductTypeEnum, { message: 'product_type must be part or decoration' })
  product_type?: ProductTypeEnum;

  @IsOptional()
  @IsEnum(VehicleTypeEnum, { message: 'vehicle_type must be car, bike or both' })
  vehicle_type?: VehicleTypeEnum;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Transform(normalizeSku)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRICE)
  price?: number;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRICE)
  market_price?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'stock cannot be below 0' })
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SetCompatibilityDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  model_ids!: string[];
}

export class ListProductsQueryDto {
  @IsOptional()
  @IsEnum(ProductTypeEnum)
  product_type?: ProductTypeEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  category_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brand_id?: number;
  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicle_type?: VehicleTypeEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_price?: number;
  @IsOptional()
  @IsUUID()
  fits_model_id?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsEnum(PRODUCT_SORT_FIELDS, { message: `sort_by must be one of: ${PRODUCT_SORT_FIELDS.join(', ')}` })
  sort_by?: ProductSortField;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsEnum(['asc', 'desc'], { message: 'sort_order must be asc or desc' })
  sort_order?: 'asc' | 'desc';
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  include_inactive?: boolean;
}

export class GetProductQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  include_inactive?: boolean;
}
