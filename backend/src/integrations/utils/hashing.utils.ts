
import * as crypto from 'crypto';
import { CatalogEntry } from '../manifest-mapper';

export interface VersionHash {
    hash: string;
    fields: string[];
}

export function calculateVersionHash(entry: CatalogEntry): VersionHash {
    const hashData: Record<string, any> = {
        name: entry.name,
        description: entry.description || null,
        icon: entry.icon || null,
        supports_devices: entry.supports_devices,
        is_cloud: entry.is_cloud,
        documentation_url: entry.documentation_url || null,
        flow_type: entry.flow_type || null,
        flow_config: entry.flow_config ? JSON.stringify(entry.flow_config) : null,
        handler_class: entry.handler_class || null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        brand_image_url: entry.brand_image_url || null,
    };

    const sortedKeys = Object.keys(hashData).sort();
    const hashString = JSON.stringify(
        sortedKeys.reduce((acc, key) => {
            acc[key] = hashData[key];
            return acc;
        }, {} as Record<string, any>)
    );

    const hash = crypto.createHash('sha256').update(hashString).digest('hex');

    return {
        hash,
        fields: sortedKeys,
    };
}

export function detectChanges(
    oldHash: string,
    newHash: string,
    oldEntry: CatalogEntry,
    newEntry: CatalogEntry
): string[] {
    if (oldHash === newHash) {
        return [];
    }

    const changedFields: string[] = [];
    const fieldsToCheck: Array<keyof CatalogEntry> = [
        'name',
        'description',
        'icon',
        'supports_devices',
        'is_cloud',
        'documentation_url',
        'flow_type',
        'handler_class',
        'brand_image_url',
    ];

    for (const field of fieldsToCheck) {
        const oldValue = oldEntry[field];
        const newValue = newEntry[field as keyof CatalogEntry];

        if (field === 'flow_config' || field === 'metadata') {
            const oldJson = oldValue ? JSON.stringify(oldValue) : null;
            const newJson = newValue ? JSON.stringify(newValue) : null;
            if (oldJson !== newJson) {
                changedFields.push(field);
            }
        } else {
            if (oldValue !== newValue) {
                changedFields.push(field);
            }
        }
    }

    return changedFields;
}
