import { Injectable, signal } from '@angular/core';
import { Observable, from, of, catchError, switchMap, tap } from 'rxjs';
import { IDBPDatabase, openDB } from 'idb';
import { AudioRecord, ImageRecord, MosiqaDb, TrackRecord } from '@core/models';

export type StorageState = 'idle' | 'loading' | 'success' | 'error';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_AUDIO_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
export const ALLOWED_IMAGE_FORMATS = ['image/png', 'image/jpeg'];

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private db: IDBPDatabase<MosiqaDb> | null = null;
  private dbReady: Promise<void>;
  private readonly _state = signal<StorageState>('idle');
  private readonly _error = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    this.dbReady = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await openDB<MosiqaDb>('mosiqa-db', 2, {
        upgrade(db, oldVersion) {
          if (oldVersion < 1) {
            const audioStore = db.createObjectStore('audio-files', { keyPath: 'id' });
            audioStore.createIndex('by-name', 'name');
            audioStore.createIndex('by-createdAt', 'createdAt');
          }

          if (oldVersion < 2) {
            if (!db.objectStoreNames.contains('cover-images')) {
              const imageStore = db.createObjectStore('cover-images', { keyPath: 'id' });
              imageStore.createIndex('by-name', 'name');
            }

            if (!db.objectStoreNames.contains('tracks')) {
              const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
              trackStore.createIndex('by-title', 'title');
              trackStore.createIndex('by-artist', 'artist');
              trackStore.createIndex('by-category', 'category');
              trackStore.createIndex('by-createdAt', 'createdAt');
            }
          }
        },
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  private getDb(): Observable<IDBPDatabase<MosiqaDb>> {
    return from(this.dbReady).pipe(
      switchMap(() => {
        if (!this.db) {
          throw new Error('Database initialization failed');
        }
        return of(this.db);
      }),
    );
  }

  validateAudioFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    if (!ALLOWED_AUDIO_FORMATS.includes(file.type)) {
      return { valid: false, error: 'Invalid audio format. Allowed: MP3, WAV, OGG' };
    }
    return { valid: true };
  }

  validateImageFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'Image size exceeds 10MB limit' };
    }
    if (!ALLOWED_IMAGE_FORMATS.includes(file.type)) {
      return { valid: false, error: 'Invalid image format. Allowed: PNG, JPEG' };
    }
    return { valid: true };
  }

  saveAudioFile(id: string, file: File): Observable<boolean> {
    const validation = this.validateAudioFile(file);
    if (!validation.valid) {
      this._error.set(validation.error!);
      return of(false);
    }

    this._state.set('loading');
    const record: AudioRecord = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      blob: file,
      createdAt: new Date(),
    };

    return this.getDb().pipe(
      switchMap((db) => from(db.put('audio-files', record))),
      switchMap(() => {
        this._state.set('success');
        return of(true);
      }),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  getAudioFile(id: string): Observable<AudioRecord | null> {
    return this.getDb().pipe(
      switchMap((db) => from(db.get('audio-files', id))),
      switchMap((result) => of(result ?? null)),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  deleteAudioFile(id: string): Observable<boolean> {
    this._state.set('loading');
    return this.getDb().pipe(
      switchMap((db) => from(db.delete('audio-files', id))),
      switchMap(() => {
        this._state.set('success');
        return of(true);
      }),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  saveCoverImage(id: string, file: File): Observable<boolean> {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      this._error.set(validation.error!);
      return of(false);
    }

    this._state.set('loading');
    const record: ImageRecord = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      blob: file,
      createdAt: new Date(),
    };

    return this.getDb().pipe(
      switchMap((db) => from(db.put('cover-images', record))),
      switchMap(() => {
        this._state.set('success');
        return of(true);
      }),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  getCoverImage(id: string): Observable<ImageRecord | null> {
    return this.getDb().pipe(
      switchMap((db) => from(db.get('cover-images', id))),
      switchMap((result) => of(result ?? null)),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  deleteCoverImage(id: string): Observable<boolean> {
    this._state.set('loading');
    return this.getDb().pipe(
      switchMap((db) => from(db.delete('cover-images', id))),
      switchMap(() => {
        this._state.set('success');
        return of(true);
      }),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  saveTrack(track: TrackRecord): Observable<boolean> {
    this._state.set('loading');
    return this.getDb().pipe(
      switchMap((db) => from(db.put('tracks', track))),
      switchMap(() => {
        this._state.set('success');
        return of(true);
      }),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  getTrack(id: string): Observable<TrackRecord | null> {
    return this.getDb().pipe(
      switchMap((db) => from(db.get('tracks', id))),
      switchMap((result) => of(result ?? null)),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  getAllTracks(): Observable<TrackRecord[]> {
    this._state.set('loading');
    return this.getDb().pipe(
      switchMap((db) => from(db.getAll('tracks'))),
      tap(() => this._state.set('success')),
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
    );
  }

  deleteTrack(id: string): Observable<boolean> {
    this._state.set('loading');
    return this.getDb().pipe(
      switchMap((db) => from(db.delete('tracks', id))),
      switchMap(() => {
        this._state.set('success');
        return of(true);
      }),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  private handleError(err: unknown): void {
    this._state.set('error');
    if (err instanceof Error) {
      switch (err.name) {
        case 'QuotaExceededError':
          this._error.set('Storage quota exceeded. Please delete some tracks.');
          break;
        case 'InvalidStateError':
          this._error.set('Database is in an invalid state. Please refresh.');
          break;
        default:
          this._error.set(err.message);
      }
    } else {
      this._error.set('An unknown error occurred');
    }
  }

  clearError(): void {
    this._error.set(null);
    this._state.set('idle');
  }
}
