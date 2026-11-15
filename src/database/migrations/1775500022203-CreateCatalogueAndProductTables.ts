import {MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCatalogueAndProductTables1775500022203 implements MigrationInterface{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'product_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
        ],
        checks: [
          {
            name: 'CHK_categories_product_type',
            expression: `"product_type" IN ('part', 'decoration')`,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_parent_id',
        columnNames: ['parent_id'],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'logo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'category_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'brand_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'product_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'vehicle_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'market_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'stock',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
        checks: [
          // stock can never go below zero, enforced by the database itself
          { name: 'CHK_products_stock_non_negative', expression: '"stock" >= 0' },
          { name: 'CHK_products_price_non_negative', expression: '"price" >= 0' },
          {
            name: 'CHK_products_product_type',
            expression: `"product_type" IN ('part', 'decoration')`,
          },
          {
            name: 'CHK_products_vehicle_type',
            expression: `"vehicle_type" IN ('car', 'bike', 'both')`,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['brand_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'brands',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndices('products', [
      new TableIndex({ name: 'IDX_products_category_id', columnNames: ['category_id'] }),
      new TableIndex({ name: 'IDX_products_brand_id', columnNames: ['brand_id'] }),
      new TableIndex({ name: 'IDX_products_product_type', columnNames: ['product_type'] }),
      new TableIndex({ name: 'IDX_products_vehicle_type', columnNames: ['vehicle_type'] }),
      new TableIndex({ name: 'IDX_products_name', columnNames: ['name'] }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'product_compatibility',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'model_id',
            type: 'uuid',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: 'UQ_product_compatibility_product_model',
            columnNames: ['product_id', 'model_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'product_compatibility',
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'product_compatibility',
      new TableForeignKey({
        columnNames: ['model_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vehicle_models',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'product_compatibility',
      new TableIndex({
        name: 'IDX_product_compatibility_model_id',
        columnNames: ['model_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('product_compatibility', true, true, true);
    await queryRunner.dropTable('products', true, true, true);
    await queryRunner.dropTable('brands', true, true, true);
    await queryRunner.dropTable('categories', true, true, true);
  }
}