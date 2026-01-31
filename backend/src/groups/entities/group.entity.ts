import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { GroupMember } from './group-member.entity';

@Entity('groups')
@Index(['name'], { unique: true })
@Index(['domain'])
export class Group {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    icon: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    domain: string;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    updatedAt: Date;

    @OneToMany(() => GroupMember, (member) => member.group)
    members: GroupMember[];
}
