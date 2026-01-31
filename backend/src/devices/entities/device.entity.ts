import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('devices')
@Index(['integrationId'])
@Index(['areaId'])
export class Device {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text', name: 'integration_id' })
    integrationId: string;

    @Column({ type: 'text', name: 'integration_name' })
    integrationName: string;

    @Column({ type: 'text', nullable: true })
    model: string;

    @Column({ type: 'text', nullable: true })
    manufacturer: string;

    @Column({ type: 'uuid', nullable: true, name: 'area_id' })
    areaId: string;

    @Column({ type: 'text', nullable: true })
    status: string;

    @Column({ type: 'text', nullable: true, name: 'unique_id' })
    uniqueId: string;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
