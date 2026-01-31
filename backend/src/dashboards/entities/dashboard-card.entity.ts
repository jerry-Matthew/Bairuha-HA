import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Dashboard } from './dashboard.entity';

@Entity('dashboard_cards')
export class DashboardCard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'dashboard_id' })
    dashboardId: string;

    @ManyToOne(() => Dashboard, (dashboard) => dashboard.cards, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'dashboard_id' })
    dashboard: Dashboard;

    @Column({ type: 'text' })
    type: string;

    @Column({ type: 'jsonb', default: {} })
    config: Record<string, any>;

    @Column({ type: 'integer', default: 0 })
    order: number;

    @Column({ type: 'integer', default: 1 })
    width: number;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'updated_at' })
    updatedAt: Date;
}
