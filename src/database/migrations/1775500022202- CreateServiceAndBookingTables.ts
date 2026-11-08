import { MigrationInterface,QueryRunner,Table,TableForeignKey} from 'typeorm';

export class CreateServiceAndBookingTables1775500022202
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.createTable(
      new Table({
        name: 'service_categories',
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
            name: 'description',
            type: 'text',
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
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'services',
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
            name: 'name',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'vehicle_type',
            type: 'varchar',
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
            name: 'duration_minutes',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'warranty_days',
            type: 'int',
            default: 0,
            isNullable: false,
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
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'services',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'service_categories',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'service_inclusions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'service_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'service_inclusions',
      new TableForeignKey({
        columnNames: ['service_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'services',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'bookings',
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
            name: 'service_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'vehicle_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'vehicle_type',
            type: 'enum',
            enum: ['car', 'bike', 'both'],
            enumName: 'bookings_vehicle_type_enum',
            isNullable: false,
          },
          {
            name: 'booking_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'start_time',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'end_time',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'pending',
              'confirmed',
              'completed',
              'cancelled',
            ],
            enumName: 'bookings_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        columnNames: ['service_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'services',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        columnNames: ['vehicle_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vehicles',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    const bookingTable = await queryRunner.getTable('bookings');

    if (bookingTable) {
      for (const foreignKey of bookingTable.foreignKeys) {
        await queryRunner.dropForeignKey(
          'bookings',
          foreignKey,
        );
      }
    }

    await queryRunner.dropTable('bookings', true);

    const inclusionTable = await queryRunner.getTable(
      'service_inclusions',
    );

    if (inclusionTable) {
      for (const foreignKey of inclusionTable.foreignKeys) {
        await queryRunner.dropForeignKey(
          'service_inclusions',
          foreignKey,
        );
      }
    }

    await queryRunner.dropTable('service_inclusions', true);

    const serviceTable = await queryRunner.getTable('services');

    if (serviceTable) {
      for (const foreignKey of serviceTable.foreignKeys) {
        await queryRunner.dropForeignKey(
          'services',
          foreignKey,
        );
      }
    }

    await queryRunner.dropTable('services', true);

    await queryRunner.dropTable(
      'service_categories',
      true,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "bookings_status_enum"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "bookings_vehicle_type_enum"`,
    );
  }
}
