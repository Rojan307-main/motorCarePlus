import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ProductTypeEnum } from '../../../common/enums/product-type.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;


const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' || value === true ? true : value === 'false' || value === false ? false : value;


export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(ProductTypeEnum, { message: 'product_type must be part or decoration' })
  product_type!: ProductTypeEnum;

  @IsOptional()
  @IsInt()
  @Min(1)
  parent_id?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parent_id?: number | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class GetCategoriesQueryDto {
  @IsOptional()
  @IsEnum(ProductTypeEnum)
  product_type?: ProductTypeEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parent_id?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  include_inactive?: boolean;
}


export class CreateBrandDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;
}

export class UpdateBrandDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;
}

export class GetBrandsQueryDto {

  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;
}
