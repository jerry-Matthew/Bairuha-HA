import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hacs_extensions')
export class HacsExtension {
    @PrimaryColumn({ type: 'text' })
    id: string;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'text' })
    type: string;

    @Column({ type: 'text', name: 'github_repo' })
    githubRepo: string;

    @Column({ type: 'integer', default: 0 })
    stars: number;

    @Column({ type: 'integer', default: 0 })
    downloads: number;

    @Column({ type: 'text', nullable: true, name: 'last_activity' })
    lastActivity: string | null;

    @Column({ type: 'text', nullable: true })
    version: string | null;

    @Column({ type: 'text', nullable: true, name: 'installed_version' })
    installedVersion: string | null;

    @Column({ type: 'text' })
    status: string;

    @Column({ type: 'boolean', default: false, name: 'restart_required' })
    restartRequired: boolean;

    @Column({ type: 'text', nullable: true, name: 'avatar_url' })
    avatarUrl: string | null;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
    updatedAt: Date;
}
