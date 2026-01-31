import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DashboardCard } from './dashboard-card.entity';

@Entity('dashboards')
export class Dashboard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text', nullable: true })
    icon: string;

    @Column({ type: 'text', name: 'url_path' })
    urlPath: string;

    @Column({ type: 'integer', default: 0 })
    order: number;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => DashboardCard, (card) => card.dashboard)
    cards: DashboardCard[];
}
