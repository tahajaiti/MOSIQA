import { DBSchema } from 'idb';

export interface AudioRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  blob: Blob;
  createdAt: Date;
}

export interface ImageRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  blob: Blob;
  createdAt: Date;
}

export interface TrackRecord {
  id: string;
  title: string;
  artist: string;
  description?: string;
  category: string;
  duration: number;
  audioFileId: string;
  coverImageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MosiqaDb extends DBSchema {
  'audio-files': {
    key: string;
    value: AudioRecord;
    indexes: { 'by-name': string; 'by-createdAt': Date };
  };
  'cover-images': {
    key: string;
    value: ImageRecord;
    indexes: { 'by-name': string };
  };
  tracks: {
    key: string;
    value: TrackRecord;
    indexes: {
      'by-title': string;
      'by-artist': string;
      'by-category': string;
      'by-createdAt': Date;
    };
  };
}
