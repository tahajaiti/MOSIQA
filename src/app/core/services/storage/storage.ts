import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';
import { MosiqaDb } from '../../models/database.model';

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
}
