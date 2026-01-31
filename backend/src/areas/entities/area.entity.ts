import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('areas')
export class Area {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    @Index()
    name: string;

    @Column({ type: 'text', nullable: true })
    icon: string;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
    @Index()
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
    updatedAt: Date;
}
