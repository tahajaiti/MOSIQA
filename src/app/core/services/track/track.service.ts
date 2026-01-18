import { computed, Injectable, signal } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  from,
  of,
  throwError,
  switchMap,
  map,
  tap,
  catchError,
  finalize,
  firstValueFrom,
  forkJoin,
} from 'rxjs';
import { Track, TrackFormData, MusicCategory } from '@core/models/track.model';
import { TrackRecord } from '@core/models/database.model';
import { StorageService } from '@core/services/storage/storage.service';

export type TrackOperationState = 'idle' | 'loading' | 'success' | 'error';

@Injectable({
  providedIn: 'root',
})
export class TrackService {
  private readonly _tracks$ = new BehaviorSubject<Track[]>([]);
  private readonly _state = signal<TrackOperationState>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _selectedTrack = signal<Track | null>(null);

  readonly tracks$ = this._tracks$.asObservable();
  readonly tracks = signal<Track[]>([]);
  readonly state = this._state.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedTrack = this._selectedTrack.asReadonly();

  readonly trackCount = computed(() => this.tracks().length);
  readonly isLoading = computed(() => this._state() === 'loading');
  readonly hasError = computed(() => this._state() === 'error');

  constructor(private storageService: StorageService) {
    this._tracks$.subscribe((tracks) => this.tracks.set(tracks));
    this.loadTracks();
  }

  loadTracks(): void {
    this._state.set('loading');
    this.storageService
      .getAllTracks()
      .pipe(
        map((records) => records.map((record) => this.mapRecordToTrack(record))),
        map((tracks) => tracks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
        tap((tracks) => {
          this._tracks$.next(tracks);
          this._state.set('success');
        }),
        catchError((error) => {
          this.handleError(error);
          return of([]);
        }),
      )
      .subscribe();
  }

  createTrack(formData: TrackFormData): Observable<Track | null> {
    this._state.set('loading');
    const id = this.generateId();
    const audioFileId = `audio-${id}`;

    return this.storageService.saveAudioFile(audioFileId, formData.audioFile).pipe(
      switchMap((audioSaved) => {
        if (!audioSaved) {
          return throwError(() => new Error('Failed to save audio file'));
        }
        return from(this.getAudioDuration(formData.audioFile));
      }),
      switchMap((duration) => {
        if (formData.coverImage) {
          const coverImageId = `cover-${id}`;
          return this.storageService.saveCoverImage(coverImageId, formData.coverImage).pipe(
            map((imageSaved) => ({
              duration,
              coverImageId: imageSaved ? coverImageId : undefined,
            })),
          );
        }
        return of({ duration, coverImageId: undefined });
      }),
      switchMap(({ duration, coverImageId }) => {
        const now = new Date();
        const trackRecord: TrackRecord = {
          id,
          title: formData.title.trim(),
          artist: formData.artist.trim(),
          description: formData.description?.trim(),
          category: formData.category,
          duration,
          audioFileId,
          coverImageId,
          createdAt: now,
          updatedAt: now,
        };

        return this.storageService.saveTrack(trackRecord).pipe(
          map((saved) => {
            if (!saved) {
              throw new Error('Failed to save track');
            }
            return this.mapRecordToTrack(trackRecord);
          }),
        );
      }),
      tap((track) => {
        const currentTracks = this._tracks$.getValue();
        this._tracks$.next([track, ...currentTracks]);
        this._state.set('success');
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  updateTrack(
    id: string,
    updates: Partial<Omit<TrackFormData, 'audioFile'>> & { audioFile?: File },
  ): Observable<Track | null> {
    this._state.set('loading');

    return this.storageService.getTrack(id).pipe(
      switchMap((record) => {
        if (!record) {
          return throwError(() => new Error('Track not found'));
        }
        return of(record);
      }),
      switchMap((existingRecord) => {
        const updateOperations: Observable<{
          audioFileId: string;
          duration: number;
          coverImageId?: string;
        }> = of({
          audioFileId: existingRecord.audioFileId,
          duration: existingRecord.duration,
          coverImageId: existingRecord.coverImageId,
        });

        if (updates.audioFile) {
          const newAudioFileId = `audio-${id}-${Date.now()}`;
          return this.storageService.saveAudioFile(newAudioFileId, updates.audioFile).pipe(
            switchMap((saved) => {
              if (!saved) {
                return throwError(() => new Error('Failed to save new audio file'));
              }
              return from(this.getAudioDuration(updates.audioFile!));
            }),
            tap(() => this.storageService.deleteAudioFile(existingRecord.audioFileId).subscribe()),
            switchMap((duration) => {
              if (updates.coverImage) {
                const newCoverImageId = `cover-${id}-${Date.now()}`;
                return this.storageService.saveCoverImage(newCoverImageId, updates.coverImage).pipe(
                  tap(() => {
                    if (existingRecord.coverImageId) {
                      this.storageService.deleteCoverImage(existingRecord.coverImageId).subscribe();
                    }
                  }),
                  map((imageSaved) => ({
                    audioFileId: newAudioFileId,
                    duration,
                    coverImageId: imageSaved ? newCoverImageId : existingRecord.coverImageId,
                  })),
                );
              }
              return of({
                audioFileId: newAudioFileId,
                duration,
                coverImageId: existingRecord.coverImageId,
              });
            }),
            map((result) => ({ existingRecord, ...result })),
          );
        }

        if (updates.coverImage) {
          const newCoverImageId = `cover-${id}-${Date.now()}`;
          return this.storageService.saveCoverImage(newCoverImageId, updates.coverImage).pipe(
            tap(() => {
              if (existingRecord.coverImageId) {
                this.storageService.deleteCoverImage(existingRecord.coverImageId).subscribe();
              }
            }),
            map((imageSaved) => ({
              existingRecord,
              audioFileId: existingRecord.audioFileId,
              duration: existingRecord.duration,
              coverImageId: imageSaved ? newCoverImageId : existingRecord.coverImageId,
            })),
          );
        }

        return of({
          existingRecord,
          audioFileId: existingRecord.audioFileId,
          duration: existingRecord.duration,
          coverImageId: existingRecord.coverImageId,
        });
      }),
      switchMap(({ existingRecord, audioFileId, duration, coverImageId }) => {
        const updatedRecord: TrackRecord = {
          ...existingRecord,
          title: updates.title?.trim() ?? existingRecord.title,
          artist: updates.artist?.trim() ?? existingRecord.artist,
          description: updates.description?.trim() ?? existingRecord.description,
          category: updates.category ?? existingRecord.category,
          audioFileId,
          coverImageId,
          duration,
          updatedAt: new Date(),
        };

        return this.storageService.saveTrack(updatedRecord).pipe(
          map((saved) => {
            if (!saved) {
              throw new Error('Failed to update track');
            }
            return this.mapRecordToTrack(updatedRecord);
          }),
        );
      }),
      tap((track) => {
        const currentTracks = this._tracks$.getValue();
        this._tracks$.next(currentTracks.map((t) => (t.id === id ? track : t)));
        if (this._selectedTrack()?.id === id) {
          this._selectedTrack.set(track);
        }
        this._state.set('success');
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  deleteTrack(id: string): Observable<boolean> {
    this._state.set('loading');

    return this.storageService.getTrack(id).pipe(
      switchMap((track) => {
        if (!track) {
          return throwError(() => new Error('Track not found'));
        }

        const deleteOperations: Observable<boolean>[] = [
          this.storageService.deleteAudioFile(track.audioFileId),
          this.storageService.deleteTrack(id),
        ];

        if (track.coverImageId) {
          deleteOperations.push(this.storageService.deleteCoverImage(track.coverImageId));
        }

        return forkJoin(deleteOperations);
      }),
      map(() => true),
      tap(() => {
        const currentTracks = this._tracks$.getValue();
        this._tracks$.next(currentTracks.filter((t) => t.id !== id));
        if (this._selectedTrack()?.id === id) {
          this._selectedTrack.set(null);
        }
        this._state.set('success');
      }),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  selectTrack(track: Track | null): void {
    this._selectedTrack.set(track);
  }

  getTrackById(id: string): Track | undefined {
    return this._tracks$.getValue().find((t) => t.id === id);
  }

  getTrackById$(id: string): Observable<Track | null> {
    return this.storageService
      .getTrack(id)
      .pipe(map((record) => (record ? this.mapRecordToTrack(record) : null)));
  }

  getAudioUrl(audioFileId: string): Observable<string | null> {
    return this.storageService
      .getAudioFile(audioFileId)
      .pipe(map((record) => (record ? URL.createObjectURL(record.blob) : null)));
  }

  getCoverImageUrl(coverImageId: string): Observable<string | null> {
    return this.storageService
      .getCoverImage(coverImageId)
      .pipe(map((record) => (record ? URL.createObjectURL(record.blob) : null)));
  }

  private mapRecordToTrack(record: TrackRecord): Track {
    return {
      id: record.id,
      title: record.title,
      artist: record.artist,
      description: record.description,
      category: record.category as MusicCategory,
      duration: record.duration,
      audioFileId: record.audioFileId,
      coverImageId: record.coverImageId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  }

  private getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });
      audio.addEventListener('error', () => {
        resolve(0);
        URL.revokeObjectURL(audio.src);
      });
      audio.src = URL.createObjectURL(file);
    });
  }

  private generateId(): string {
    return `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private handleError(error: unknown): void {
    this._state.set('error');
    if (error instanceof Error) {
      this._error.set(error.message);
    } else {
      this._error.set('An unknown error occurred');
    }
  }

  clearError(): void {
    this._error.set(null);
    this._state.set('idle');
  }
}
