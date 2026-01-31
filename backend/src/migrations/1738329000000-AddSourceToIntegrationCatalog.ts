import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSourceToIntegrationCatalog1738329000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'integration_catalog',
            new TableColumn({
                name: 'source',
                type: 'text',
                default: "'ha'",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('integration_catalog', 'source');
    }
}
