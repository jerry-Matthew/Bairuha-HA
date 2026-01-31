import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('config_flows')
export class ConfigFlow {
    @PrimaryColumn({ type: 'uuid' })
    id: string;

    @Column({ type: 'uuid', name: 'user_id', nullable: true })
    @Index()
    userId: string | null;

    @Column({ type: 'text', name: 'integration_domain', nullable: true })
    @Index()
    integrationDomain: string | null;

    @Column({ type: 'text' })
    step: string;

    @Column({ type: 'jsonb', default: {} })
    data: Record<string, any>;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'updated_at' })
    updatedAt: Date;
}
