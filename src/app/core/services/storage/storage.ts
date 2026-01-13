import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';
import { AudioRecord, MosiqaDb } from '../../models/database.model';

@Injectable({
  providedIn: 'root',
})
export class Storage {
  private dbPromise: Promise<IDBPDatabase<MosiqaDb>>;

  constructor() {
    this.dbPromise = this.initializeDatabase();
  }

  private initializeDatabase() {
    return openDB<MosiqaDb>('mosiqa-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('audio-files')) {
          db.createObjectStore('audio-files', { keyPath: 'id' });
        }
      },
    });
  }

  async saveFile(id: string, file: File) {
    try {
      const db = await this.dbPromise;

      const record: AudioRecord = {
        id: id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        blob: file,
        createdAt: new Date(),
      };

      await db.put('audio-files', record);
      console.log(`File ${file.name} saved successfully.`);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  async getFile(id: string) {
    try {
      const db = await this.dbPromise;

      const record = await db.get('audio-files', id);

      if (record) {
        console.log(`File ${record.name} retrieved successfully.`);
        return record;
      }

      console.log(`File with id ${id} not found.`);
      return null;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async deleteFile(id: string) {
    try {
      const db = await this.dbPromise;

      await db.delete('audio-files', id);
      console.log(`File with id ${id} deleted successfully.`);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  async getEstimatedStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const { usage, quota } = await navigator.storage.estimate();

        const MB = 1024 * 1024;
        console.log(`Storage usage: ${(usage! / MB).toFixed(2)} MB`);
        console.log(`Storage quota: ${(quota! / MB).toFixed(2)} MB`);

        return { usage, quota };
      } catch (error) {
        console.error('Error estimating storage usage:', error);
        return null;
      }
    } else {
      console.warn('Storage estimation API not supported in this browser.');
      return null;
    }
  }

  private handleError(err: unknown) {
    if (err instanceof Error) {
      switch (err.name) {
        case 'QuotaExceededError':
          console.error('Storage quota exceeded:', err.message);
          break;
        case 'InvalidStateError':
          console.error('Invalid state error:', err.message);
          break;
        default:
          console.error('Storage error:', err.message);
      }
    } else {
      console.error('Unknown error:', err);
    }
  }
}
