
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateCartOrderPaymentTables1775500022204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.createTable(
      new Table({
        name: 'carts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'checked_out'],
            enumName: 'carts_status_enum',
            default: "'active'",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'carts',
      new TableForeignKey({
        name: 'FK_carts_user_id',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'carts',
      new TableIndex({
        name: 'IDX_carts_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_carts_one_active_per_user"
       ON "carts" ("user_id")
       WHERE "status" = 'active'`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'cart_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: 'UQ_cart_items_cart_product',
            columnNames: ['cart_id', 'product_id'],
          },
        ],
        checks: [
          {
            name: 'CHK_cart_items_quantity',
            expression: '"quantity" >= 1',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        name: 'FK_cart_items_cart_id',
        columnNames: ['cart_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'carts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        name: 'FK_cart_items_product_id',
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'cart_items',
      new TableIndex({
        name: 'IDX_cart_items_product_id',
        columnNames: ['product_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'fulfilment_method',
            type: 'enum',
            enum: ['pickup', 'delivery'],
            enumName: 'orders_fulfilment_method_enum',
            isNullable: false,
          },
          {
            name: 'delivery_address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'order_status',
            type: 'enum',
            enum: ['pending', 'paid', 'cancelled'],
            enumName: 'orders_order_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        checks: [
          {
            name: 'CHK_orders_total_amount',
            expression: '"total_amount" >= 0',
          },
          {
            name: 'CHK_orders_delivery_address',
            expression: `"fulfilment_method" = 'pickup' OR ("delivery_address" IS NOT NULL AND length(trim("delivery_address")) > 0)`,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_orders_user_id',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'unit_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
        ],
        checks: [
          {
            name: 'CHK_order_items_quantity',
            expression: '"quantity" >= 1',
          },
          {
            name: 'CHK_order_items_unit_price',
            expression: '"unit_price" >= 0',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        name: 'FK_order_items_order_id',
        columnNames: ['order_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        name: 'FK_order_items_product_id',
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'order_items',
      new TableIndex({
        name: 'IDX_order_items_order_id',
        columnNames: ['order_id'],
      }),
    );

    await queryRunner.createIndex(
      'order_items',
      new TableIndex({
        name: 'IDX_order_items_product_id',
        columnNames: ['product_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'int',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'method',
            type: 'enum',
            enum: [
              'cash_on_delivery',
              'card_simulated',
              'mobile_banking_simulated',
            ],
            enumName: 'payments_method_enum',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'paid', 'failed'],
            enumName: 'payments_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'transaction_ref',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'paid_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
        checks: [
          {
            name: 'CHK_payments_amount',
            expression: '"amount" >= 0',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'FK_payments_order_id',
        columnNames: ['order_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    
    const paymentTable = await queryRunner.getTable('payments');
    if (paymentTable) {
      for (const foreignKey of paymentTable.foreignKeys) {
        await queryRunner.dropForeignKey('payments', foreignKey);
      }
    }
    await queryRunner.dropTable('payments', true);

    const orderItemTable = await queryRunner.getTable('order_items');
    if (orderItemTable) {
      for (const foreignKey of orderItemTable.foreignKeys) {
        await queryRunner.dropForeignKey('order_items', foreignKey);
      }
    }
    await queryRunner.dropTable('order_items', true);

    const orderTable = await queryRunner.getTable('orders');
    if (orderTable) {
      for (const foreignKey of orderTable.foreignKeys) {
        await queryRunner.dropForeignKey('orders', foreignKey);
      }
    }
    await queryRunner.dropTable('orders', true);

    const cartItemTable = await queryRunner.getTable('cart_items');
    if (cartItemTable) {
      for (const foreignKey of cartItemTable.foreignKeys) {
        await queryRunner.dropForeignKey('cart_items', foreignKey);
      }
    }
    await queryRunner.dropTable('cart_items', true);

    // ---------- carts ----------
    const cartTable = await queryRunner.getTable('carts');
    if (cartTable) {
      for (const foreignKey of cartTable.foreignKeys) {
        await queryRunner.dropForeignKey('carts', foreignKey);
      }
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_carts_one_active_per_user"`,
    );

    await queryRunner.dropTable('carts', true);

    // ---------- enum types ----------
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payments_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "orders_order_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "orders_fulfilment_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "carts_status_enum"`,
    );
  }
}

