import { DBSchema } from 'idb';

export type AudioRecord = {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    blob: Blob;
    createdAt: Date;
};

export interface MosiqaDb extends DBSchema {
    'audio-files': {
        key: string;
        value: AudioRecord;
        indexes: { 'by-name': string; 'by-createdAt': Date };
    };
}
