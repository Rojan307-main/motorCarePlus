import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource, In, Repository } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { ProductCompatibilityEntity } from './entities/product-compatibility.entity';
import { CategoryEntity } from '../catalogue/entities/category.entity';
import { BrandEntity } from '../catalogue/entities/brand.entity';
import { VehicleModelEntity } from '../vehicle/entities/vehicle-model.entity';
import { LocalStorageService } from '../../providers/storage/local/storage.service';
import {CreateProductDto,ListProductsQueryDto,ProductSortField,SetCompatibilityDto,UpdateProductDto} from './dto/product.dto';
import { ProductTypeEnum } from '../../common/enums/product-type.enum';
import { VehicleTypeEnum } from '../../common/enums/vehicle-type.enum';
import { buildPaginatedResponse, DEFAULT_PAGE_LIMIT } from '../../common/helpers/pagination.helper';

const BULK_MAX_ITEMS = 1000;
const INSERT_CHUNK_SIZE = 500; 

const SORT_COLUMNS: Record<ProductSortField, string> = {
  name: 'product.name',
  price: 'product.price',
  created_at: 'product.created_at',
  stock: 'product.stock',
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ProductCompatibilityEntity)
    private readonly compatibilityRepository: Repository<ProductCompatibilityEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(BrandEntity)
    private readonly brandRepository: Repository<BrandEntity>,
    @InjectRepository(VehicleModelEntity)
    private readonly modelRepository: Repository<VehicleModelEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly storageService: LocalStorageService,
  ) {}


  async findAll(query: ListProductsQueryDto) {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const offset = query.offset ?? 0;

    if (
      query.min_price !== undefined &&
      query.max_price !== undefined &&
      query.min_price > query.max_price
    ) {
      throw new BadRequestException('min_price cannot be greater than max_price');
    }

    const qb = this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category')
      .innerJoinAndSelect('product.brand', 'brand');

    if (!query.include_inactive) {
      qb.andWhere('product.is_active = true').andWhere('category.is_active = true');
    }
    if (query.product_type) {
      qb.andWhere('product.product_type = :product_type', { product_type: query.product_type });
    }
    if (query.category_id !== undefined) {
      qb.andWhere('product.category_id = :category_id', { category_id: query.category_id });
    }
    if (query.brand_id !== undefined) {
      qb.andWhere('product.brand_id = :brand_id', { brand_id: query.brand_id });
    }
    if (query.vehicle_type) {
      if (query.vehicle_type === VehicleTypeEnum.BOTH) {
        qb.andWhere('product.vehicle_type = :both', { both: VehicleTypeEnum.BOTH });
      } else {
        qb.andWhere('product.vehicle_type IN (:...vehicle_types)', {
          vehicle_types: [query.vehicle_type, VehicleTypeEnum.BOTH],
        });
      }
    }
    if (query.min_price !== undefined) {
      qb.andWhere('product.price >= :min_price', { min_price: query.min_price });
    }
    if (query.max_price !== undefined) {
      qb.andWhere('product.price <= :max_price', { max_price: query.max_price });
    }
    if (query.fits_model_id) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM product_compatibility pc
                 WHERE pc.product_id = product.id AND pc.model_id = :fits_model_id)`,
        { fits_model_id: query.fits_model_id },
      );
    }
    if (query.q) {
      const escaped = query.q.replace(/[\\%_]/g, (char) => `\\${char}`);
      qb.andWhere('(product.name ILIKE :q OR product.sku ILIKE :q)', { q: `%${escaped}%` });
    }

    qb.orderBy(
      SORT_COLUMNS[query.sort_by ?? 'created_at'],
      (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC',
    )
      .addOrderBy('product.id', 'ASC') 
      .skip(offset)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(data, total, limit, offset);
  }

  async findOne(id: number, includeInactive = false, productType?: ProductTypeEnum) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true, brand: true, compatibilities: { model: { make: true } } },
    });

    const hidden =
      !product ||
      (productType && product.product_type !== productType) ||
      (!includeInactive && (!product.is_active || !product.category.is_active));
    if (hidden) {
      throw new NotFoundException('Product not found');
    }

    const { compatibilities, ...rest } = product;
    const compatible_models = compatibilities
      .map((compatibility) => compatibility.model)
      .sort(
        (a, b) => a.make.name.localeCompare(b.make.name) || a.name.localeCompare(b.name),
      );

    return { ...rest, compatible_models };
  }

  async create(dto: CreateProductDto) {
    const ids = await this.createMany([dto], false);
    return this.findOne(ids[0], true);
  }

  async createBulk(payload: unknown) {
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new BadRequestException('Send a non-empty JSON array of products');
    }
    if (payload.length > BULK_MAX_ITEMS) {
      throw new BadRequestException(`At most ${BULK_MAX_ITEMS} products per request`);
    }

    const dtos: CreateProductDto[] = [];
    const errors: string[] = [];

    for (let index = 0; index < payload.length; index++) {
      const item: unknown = payload[index];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`products[${index}]: must be an object`);
        continue;
      }
      const dto = plainToInstance(CreateProductDto, item);
      const problems = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      for (const problem of problems) {
        for (const message of Object.values(problem.constraints ?? {})) {
          errors.push(`products[${index}]: ${message}`);
        }
      }
      dtos.push(dto);
    }
    if (errors.length) {
      throw new BadRequestException({ message: errors, error: 'Bad Request', statusCode: 400 });
    }

    const ids = await this.createMany(dtos, true);
    return {
      created: ids.length,
      products: ids.map((id, index) => ({ id, sku: dtos[index].sku, name: dtos[index].name })),
    };
  }
  private async createMany(dtos: CreateProductDto[], bulk: boolean): Promise<number[]> {
    const at = (index: number) => (bulk ? `products[${index}]: ` : '');
    const invalid: string[] = [];
    const conflicts: string[] = [];

    const categoryIds = [...new Set(dtos.map((dto) => dto.category_id))];
    const brandIds = [...new Set(dtos.map((dto) => dto.brand_id))];
    const skus = dtos.map((dto) => dto.sku);
    const modelIds = [...new Set(dtos.flatMap((dto) => dto.model_ids ?? []))];

    const [categories, brands, takenSkus, models] = await Promise.all([
      this.categoryRepository.find({ where: { id: In(categoryIds) } }),
      this.brandRepository.find({ where: { id: In(brandIds) } }),
      this.productRepository.find({ select: { sku: true }, where: { sku: In(skus) } }),
      modelIds.length
        ? this.modelRepository.find({ where: { id: In(modelIds) }, relations: { make: true } })
        : Promise.resolve([] as VehicleModelEntity[]),
    ]);

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const brandIds_ = new Set(brands.map((brand) => brand.id));
    const takenSet = new Set(takenSkus.map((product) => product.sku));
    const modelById = new Map(models.map((model) => [model.id, model]));
    const firstIndexOfSku = new Map<string, number>();

    dtos.forEach((dto, index) => {
      const category = categoryById.get(dto.category_id);
      if (!category) {
        invalid.push(`${at(index)}category ${dto.category_id} not found`);
      } else if (!category.is_active) {
        invalid.push(`${at(index)}category ${dto.category_id} is inactive`);
      } else if (category.product_type !== dto.product_type) {
        invalid.push(
          `${at(index)}category ${dto.category_id} is a ${category.product_type} category but product_type is ${dto.product_type}`,
        );
      }

      if (!brandIds_.has(dto.brand_id)) {
        invalid.push(`${at(index)}brand ${dto.brand_id} not found`);
      }

      for (const model_id of dto.model_ids ?? []) {
        const model = modelById.get(model_id);
        if (!model) {
          invalid.push(`${at(index)}vehicle model ${model_id} not found`);
        } else if (
          dto.vehicle_type !== VehicleTypeEnum.BOTH &&
          model.make.vehicle_type !== dto.vehicle_type
        ) {
          invalid.push(
            `${at(index)}model "${model.make.name} ${model.name}" is a ${model.make.vehicle_type} model but vehicle_type is ${dto.vehicle_type}`,
          );
        }
      }

      const firstIndex = firstIndexOfSku.get(dto.sku);
      if (firstIndex !== undefined) {
        invalid.push(`${at(index)}sku ${dto.sku} is repeated in this request (also at index ${firstIndex})`);
      } else {
        firstIndexOfSku.set(dto.sku, index);
      }
      if (takenSet.has(dto.sku)) {
        conflicts.push(`${at(index)}sku ${dto.sku} already exists`);
      }
    });

    if (invalid.length) {
      throw new BadRequestException({ message: invalid, error: 'Bad Request', statusCode: 400 });
    }
    if (conflicts.length) {
      throw new ConflictException({ message: conflicts, error: 'Conflict', statusCode: 409 });
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const ids: number[] = [];

        for (let start = 0; start < dtos.length; start += INSERT_CHUNK_SIZE) {
          const rows = dtos.slice(start, start + INSERT_CHUNK_SIZE).map((dto) => ({
            category_id: dto.category_id,
            brand_id: dto.brand_id,
            product_type: dto.product_type,
            vehicle_type: dto.vehicle_type,
            name: dto.name,
            sku: dto.sku,
            description: dto.description ?? null,
            price: dto.price.toFixed(2),
            market_price: dto.market_price !== undefined ? dto.market_price.toFixed(2) : null,
            stock: dto.stock ?? 0,
            image_url: dto.image_url ?? null,
            is_active: dto.is_active ?? true,
          }));

          const result = await manager
            .createQueryBuilder()
            .insert()
            .into(ProductEntity)
            .values(rows)
            .execute();
          ids.push(...result.identifiers.map((identifier) => identifier.id as number));
        }

        const links = dtos.flatMap((dto, index) =>
          (dto.model_ids ?? []).map((model_id) => ({ product_id: ids[index], model_id })),
        );
        for (let start = 0; start < links.length; start += INSERT_CHUNK_SIZE * 2) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(ProductCompatibilityEntity)
            .values(links.slice(start, start + INSERT_CHUNK_SIZE * 2))
            .execute();
        }

        return ids;
      });
    } catch (error) {
      this.rethrowUniqueViolation(error);
      throw error;
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.getProductOrFail(id);
    const changes: Partial<ProductEntity> = {};

    // category and product_type must always agree
    if (dto.category_id !== undefined || dto.product_type !== undefined) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.category_id ?? product.category_id },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      if (dto.category_id !== undefined && dto.category_id !== product.category_id && !category.is_active) {
        throw new BadRequestException('Category is inactive');
      }
      const productType = dto.product_type ?? product.product_type;
      if (category.product_type !== productType) {
        throw new BadRequestException(
          `Category "${category.name}" is a ${category.product_type} category, but the product would be a ${productType}`,
        );
      }
      if (dto.category_id !== undefined) changes.category_id = dto.category_id;
      if (dto.product_type !== undefined) changes.product_type = dto.product_type;
    }

    if (dto.brand_id !== undefined) {
      const brand = await this.brandRepository.findOne({ where: { id: dto.brand_id } });
      if (!brand) {
        throw new NotFoundException('Brand not found');
      }
      changes.brand_id = dto.brand_id;
    }

    if (dto.sku !== undefined && dto.sku !== product.sku) {
      const taken = await this.productRepository.findOne({ where: { sku: dto.sku } });
      if (taken && taken.id !== id) {
        throw new ConflictException(`sku ${dto.sku} already exists`);
      }
      changes.sku = dto.sku;
    }
    if (dto.vehicle_type !== undefined && dto.vehicle_type !== VehicleTypeEnum.BOTH) {
      const clashing = await this.compatibilityRepository
        .createQueryBuilder('pc')
        .innerJoin('pc.model', 'model')
        .innerJoin('model.make', 'make')
        .where('pc.product_id = :id', { id })
        .andWhere('make.vehicle_type != :vehicle_type', { vehicle_type: dto.vehicle_type })
        .getCount();
      if (clashing > 0) {
        throw new BadRequestException(
          `${clashing} linked vehicle model(s) are not ${dto.vehicle_type} models. Update the compatibility first.`,
        );
      }
    }
    if (dto.vehicle_type !== undefined) changes.vehicle_type = dto.vehicle_type;

    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.price !== undefined) changes.price = dto.price.toFixed(2);
    if (dto.market_price !== undefined) {
      changes.market_price = dto.market_price === null ? null : dto.market_price.toFixed(2);
    }
    if (dto.stock !== undefined) changes.stock = dto.stock;
    if (dto.image_url !== undefined) changes.image_url = dto.image_url;
    if (dto.is_active !== undefined) changes.is_active = dto.is_active;

    if (Object.keys(changes).length > 0) {
      try {
        await this.productRepository.update(id, changes);
      } catch (error) {
        this.rethrowUniqueViolation(error);
        throw error;
      }
    }
    return this.findOne(id, true);
  }

  // not a delete: the row stays so old orders and carts can still point to it
  async deactivate(id: number): Promise<{ message: string }> {
    const product = await this.getProductOrFail(id);
    if (!product.is_active) {
      throw new BadRequestException('Product is already inactive');
    }
    await this.productRepository.update(id, { is_active: false });
    return { message: 'Product deactivated successfully' };
  }

  async setCompatibility(id: number, dto: SetCompatibilityDto) {
    const product = await this.getProductOrFail(id);
    const wanted = dto.model_ids;

    const models = wanted.length
      ? await this.modelRepository.find({ where: { id: In(wanted) }, relations: { make: true } })
      : [];

    const found = new Set(models.map((model) => model.id));
    const missing = wanted.filter((model_id) => !found.has(model_id));
    if (missing.length) {
      throw new BadRequestException(`Vehicle model(s) not found: ${missing.join(', ')}`);
    }

    if (product.vehicle_type !== VehicleTypeEnum.BOTH) {
      const wrong = models.filter((model) => model.make.vehicle_type !== product.vehicle_type);
      if (wrong.length) {
        throw new BadRequestException(
          `This is a ${product.vehicle_type} product, but these models are not: ${wrong
            .map((model) => `${model.make.name} ${model.name}`)
            .join(', ')}`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.find(ProductCompatibilityEntity, { where: { product_id: id } });
      const existingIds = new Set(existing.map((link) => link.model_id));
      const wantedIds = new Set(wanted);

      const toRemove = existing.filter((link) => !wantedIds.has(link.model_id)).map((link) => link.model_id);
      const toAdd = wanted.filter((model_id) => !existingIds.has(model_id));

      if (toRemove.length) {
        await manager.delete(ProductCompatibilityEntity, { product_id: id, model_id: In(toRemove) });
      }
      for (let start = 0; start < toAdd.length; start += INSERT_CHUNK_SIZE * 2) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(ProductCompatibilityEntity)
          .values(toAdd.slice(start, start + INSERT_CHUNK_SIZE * 2).map((model_id) => ({ product_id: id, model_id })))
          .orIgnore() 
          .execute();
      }
    });

    return this.findOne(id, true);
  }


  async updatePhoto(id: number, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Photo file is required (multipart field name: file)');
    }

    try {
      await this.storageService.assertValidImage(file);
      const product = await this.getProductOrFail(id);

      const image_url = this.storageService.toProductPhotoUrl(file.filename);
      await this.productRepository.update(id, { image_url });
      await this.storageService.deleteProductPhoto(product.image_url);
    } catch (error) {
      await this.storageService.deleteFile(file.path);
      throw error;
    }

    return this.findOne(id, true);
  }

  private async getProductOrFail(id: number): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private rethrowUniqueViolation(error: unknown) {
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException('A product with this sku already exists');
    }
  }
}