import { DBSchema } from 'idb';

export interface MosiqaDb extends DBSchema {
    'audio-files': {
        key: string;
        value: {
            id: string;
            name: string;
            size: number;
            mimeType: string;
            blob: Blob;
            createdAt: Date;
        };
        indexes: { 'by-name': string; 'by-createdAt': Date };
    }
}
