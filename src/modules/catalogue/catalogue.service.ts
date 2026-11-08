import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { BrandEntity } from './entities/brand.entity';
import { CreateBrandDto, CreateCategoryDto, GetBrandsQueryDto,GetCategoriesQueryDto,UpdateBrandDto,UpdateCategoryDto } from './dto/catalogue.dto';

@Injectable()
export class CatalogueService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(BrandEntity)
    private readonly brandRepository: Repository<BrandEntity>,
  ) {}


  findAllCategories(query: GetCategoriesQueryDto): Promise<CategoryEntity[]> {
    const where: FindOptionsWhere<CategoryEntity> = {};

    if (query.product_type) where.product_type = query.product_type;
    if (query.parent_id !== undefined) where.parent_id = query.parent_id;
    if (!query.include_inactive) where.is_active = true;

    return this.categoryRepository.find({
      where,
      order: { product_type: 'ASC', name: 'ASC' },
    });
  }

  async createCategory(dto: CreateCategoryDto): Promise<CategoryEntity> {
    if (dto.parent_id !== undefined) {
      const parent = await this.getParentOrFail(dto.parent_id);
      if (parent.product_type !== dto.product_type) {
        throw new BadRequestException('A sub-category must have the same product_type as its parent');
      }
    }

    await this.assertCategoryNameFree(dto.name, dto.product_type, dto.parent_id ?? null);

    return this.categoryRepository.save(
      this.categoryRepository.create({
        name: dto.name,
        product_type: dto.product_type,
        parent_id: dto.parent_id ?? null,
        is_active: dto.is_active ?? true,
      }),
    );
  }

  async updateCategory(id: number, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.parent_id !== undefined) {
      if (dto.parent_id !== null) {
        if (dto.parent_id === id) {
          throw new BadRequestException('A category cannot be its own parent');
        }
        const parent = await this.getParentOrFail(dto.parent_id);
        if (parent.product_type !== category.product_type) {
          throw new BadRequestException('A sub-category must have the same product_type as its parent');
        }
        await this.assertNoCycle(id, parent);
      }
      category.parent_id = dto.parent_id;
    }

    if (dto.name !== undefined) {
      category.name = dto.name;
    }
    if (dto.is_active !== undefined) {
      category.is_active = dto.is_active;
    }

    if (dto.name !== undefined || dto.parent_id !== undefined) {
      await this.assertCategoryNameFree(category.name, category.product_type, category.parent_id, id);
    }

    await this.categoryRepository.save(category);
    return this.categoryRepository.findOneOrFail({ where: { id } });
  }

  private async getParentOrFail(parent_id: number): Promise<CategoryEntity> {
    const parent = await this.categoryRepository.findOne({ where: { id: parent_id } });
    if (!parent) {
      throw new NotFoundException('Parent category not found');
    }
    return parent;
  }

  private async assertNoCycle(id: number, newParent: CategoryEntity) {
    let current: CategoryEntity | null = newParent;
    while (current) {
      if (current.id === id) {
        throw new BadRequestException('A category cannot be moved under its own sub-category');
      }
      current = current.parent_id
        ? await this.categoryRepository.findOne({ where: { id: current.parent_id } })
        : null;
    }
  }

  private async assertCategoryNameFree(
    name: string,
    product_type: CategoryEntity['product_type'],
    parent_id: number | null,
    ignoreId?: number,
  ) {
    const qb = this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .andWhere('category.product_type = :product_type', { product_type });

    if (parent_id === null) {
      qb.andWhere('category.parent_id IS NULL');
    } else {
      qb.andWhere('category.parent_id = :parent_id', { parent_id });
    }
    if (ignoreId !== undefined) {
      qb.andWhere('category.id != :ignoreId', { ignoreId });
    }

    if (await qb.getExists()) {
      throw new ConflictException('A category with this name already exists here');
    }
  }


  findAllBrands(query: GetBrandsQueryDto): Promise<BrandEntity[]> {
    const qb = this.brandRepository.createQueryBuilder('brand').orderBy('brand.name', 'ASC');

    if (query.q) {
      const escaped = query.q.replace(/[\\%_]/g, (char) => `\\${char}`);
      qb.where('brand.name ILIKE :q', { q: `%${escaped}%` });
    }

    return qb.getMany();
  }

  async createBrand(dto: CreateBrandDto): Promise<BrandEntity> {
    await this.assertBrandNameFree(dto.name);

    return this.brandRepository.save(
      this.brandRepository.create({
        name: dto.name,
        logo_url: dto.logo_url ?? null,
      }),
    );
  }

  async updateBrand(id: number, dto: UpdateBrandDto): Promise<BrandEntity> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (dto.name !== undefined) {
      await this.assertBrandNameFree(dto.name, id);
      brand.name = dto.name;
    }
    if (dto.logo_url !== undefined) {
      brand.logo_url = dto.logo_url;
    }

    return this.brandRepository.save(brand);
  }

  private async assertBrandNameFree(name: string, ignoreId?: number) {
    const qb = this.brandRepository
      .createQueryBuilder('brand')
      .where('LOWER(brand.name) = LOWER(:name)', { name });
    if (ignoreId !== undefined) {
      qb.andWhere('brand.id != :ignoreId', { ignoreId });
    }
    if (await qb.getExists()) {
      throw new ConflictException('A brand with this name already exists');
    }
  }
}
