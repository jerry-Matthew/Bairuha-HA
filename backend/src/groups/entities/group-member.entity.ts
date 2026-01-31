import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Group } from './group.entity';
import { EntityState } from '../../devices/entities/entity-state.entity';

@Entity('group_members')
@Index(['groupId', 'entityId'], { unique: true })
@Index(['groupId'])
@Index(['entityId'])
export class GroupMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'group_id' })
    groupId: string;

    @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group: Group;

    @Column({ type: 'uuid', name: 'entity_id' })
    entityId: string;

    @ManyToOne(() => EntityState, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'entity_id' })
    entity: EntityState;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    createdAt: Date;
}
