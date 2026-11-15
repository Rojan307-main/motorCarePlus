import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateUserAndVehicleTables1775500022201 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'full_name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['ROLE_ADMIN', 'ROLE_USER'],
            enumName: 'users_role_enum',
            default: "'ROLE_USER'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
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
        name: 'vehicle_makes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'vehicle_type',
            type: 'varchar',
            isNullable: false,
          },
        ],
        uniques: [{ columnNames: ['name', 'vehicle_type'] }],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'vehicle_models',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'make_id',
            type: 'uuid',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'vehicle_models',
      new TableForeignKey({
        columnNames: ['make_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vehicle_makes',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'vehicles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'model_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'year',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'registration_number',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'vehicles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'vehicles',
      new TableForeignKey({
        columnNames: ['model_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vehicle_models',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const vehicleTable = await queryRunner.getTable('vehicles');
    if (vehicleTable) {
      for (const foreignKey of vehicleTable.foreignKeys) {
        await queryRunner.dropForeignKey('vehicles', foreignKey);
      }
    }
    await queryRunner.dropTable('vehicles', true);

    const modelTable = await queryRunner.getTable('vehicle_models');
    if (modelTable) {
      for (const foreignKey of modelTable.foreignKeys) {
        await queryRunner.dropForeignKey('vehicle_models', foreignKey);
      }
    }
    await queryRunner.dropTable('vehicle_models', true);

    await queryRunner.dropTable('vehicle_makes', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}