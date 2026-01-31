import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('media_files')
export class MediaFile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text' })
    type: string;

    @Column({ type: 'integer' })
    size: number;

    @Column({ type: 'text', name: 'file_path' })
    filePath: string;

    @Column({ type: 'text' })
    url: string;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'uploaded_at' })
    uploadedAt: Date;
}
