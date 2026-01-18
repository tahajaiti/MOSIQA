import { computed, effect, Injectable, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { DEFAULT_PLAYER_STATUS, PlayerStatus, RepeatMode } from '@core/models/player.model';
import { Track } from '@core/models/track.model';
import { TrackService } from '@core/services/track/track.service';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  private audio: HTMLAudioElement;
  private readonly destroy$ = new Subject<void>();
  private readonly _status = signal<PlayerStatus>(DEFAULT_PLAYER_STATUS);
  private readonly _queue = signal<Track[]>([]);
  private readonly _currentTrack = signal<Track | null>(null);
  private readonly _queueIndex = signal<number>(-1);

  readonly status = this._status.asReadonly();
  readonly queue = this._queue.asReadonly();
  readonly currentTrack = this._currentTrack.asReadonly();
  readonly queueIndex = this._queueIndex.asReadonly();

  readonly isPlaying = computed(() => this._status().state === 'playing');
  readonly isPaused = computed(() => this._status().state === 'paused');
  readonly isStopped = computed(() => this._status().state === 'stopped');
  readonly currentTime = computed(() => this._status().currentTime);
  readonly duration = computed(() => this._status().duration);
  readonly volume = computed(() => this._status().volume);
  readonly isMuted = computed(() => this._status().isMuted);
  readonly progress = computed(() => {
    const dur = this._status().duration;
    return dur > 0 ? (this._status().currentTime / dur) * 100 : 0;
  });

  constructor(private trackService: TrackService) {
    this.audio = new Audio();
    this.setupAudioEventListeners();
    this.setupQueueSync();
  }

  private setupAudioEventListeners(): void {
    this.audio.volume = this._status().volume;

    this.audio.addEventListener('timeupdate', () => {
      this.updateStatus({ currentTime: this.audio.currentTime });
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.updateStatus({ duration: this.audio.duration });
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnd();
    });

    this.audio.addEventListener('playing', () => {
      this.updateStatus({ state: 'playing' });
    });

    this.audio.addEventListener('pause', () => {
      if (!this.audio.ended) {
        this.updateStatus({ state: 'paused' });
      }
    });

    this.audio.addEventListener('waiting', () => {
      this.updateStatus({ state: 'buffering' });
    });

    this.audio.addEventListener('error', () => {
      this.updateStatus({ state: 'stopped' });
    });
  }

  private setupQueueSync(): void {
    this.trackService.tracks$.pipe(takeUntil(this.destroy$)).subscribe((tracks) => {
      if (this._queue().length === 0 && tracks.length > 0) {
        this._queue.set([...tracks]);
      } else {
        const currentQueue = this._queue();
        const updatedQueue = currentQueue
          .map((queueTrack) => tracks.find((t) => t.id === queueTrack.id))
          .filter((t): t is Track => t !== undefined);
        this._queue.set(updatedQueue);
      }
    });
  }

  play(track?: Track): void {
    if (track) {
      this.loadTrack(track);
    } else if (this.audio.src) {
      this.audio.play().catch(() => this.updateStatus({ state: 'stopped' }));
    }
  }

  pause(): void {
    this.audio.pause();
    this.updateStatus({ state: 'paused' });
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.updateStatus({ state: 'stopped', currentTime: 0 });
  }

  next(): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const repeatMode = this._status().repeatMode;

    if (queue.length === 0) return;

    let nextIndex: number;

    if (this._status().isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (currentIndex < queue.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      this.stop();
      return;
    }

    this._queueIndex.set(nextIndex);
    this.play(queue[nextIndex]);
  }

  previous(): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();

    if (queue.length === 0) return;

    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    let prevIndex: number;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    } else if (this._status().repeatMode === 'all') {
      prevIndex = queue.length - 1;
    } else {
      prevIndex = 0;
    }

    this._queueIndex.set(prevIndex);
    this.play(queue[prevIndex]);
  }

  seek(time: number): void {
    if (!isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    }
  }

  seekToPercent(percent: number): void {
    if (!isNaN(this.audio.duration)) {
      this.seek((percent / 100) * this.audio.duration);
    }
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.audio.volume = clampedVolume;
    this.updateStatus({ volume: clampedVolume, isMuted: clampedVolume === 0 });
  }

  toggleMute(): void {
    const isMuted = !this._status().isMuted;
    this.audio.muted = isMuted;
    this.updateStatus({ isMuted });
  }

  toggleShuffle(): void {
    this.updateStatus({ isShuffled: !this._status().isShuffled });
  }

  toggleRepeat(): void {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(this._status().repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.updateStatus({ repeatMode: nextMode });
  }

  setQueue(tracks: Track[]): void {
    this._queue.set([...tracks]);
    this._queueIndex.set(-1);
  }

  addToQueue(track: Track): void {
    this._queue.update((q) => [...q, track]);
  }

  removeFromQueue(trackId: string): void {
    const currentIndex = this._queueIndex();
    const queue = this._queue();
    const removeIndex = queue.findIndex((t) => t.id === trackId);

    if (removeIndex === -1) return;

    this._queue.update((q) => q.filter((t) => t.id !== trackId));

    if (removeIndex < currentIndex) {
      this._queueIndex.update((i) => i - 1);
    } else if (removeIndex === currentIndex) {
      this.stop();
      this._currentTrack.set(null);
      this._queueIndex.set(-1);
    }
  }

  private loadTrack(track: Track): void {
    this.trackService
      .getAudioUrl(track.audioFileId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((audioUrl) => {
        if (!audioUrl) return;

        if (this.audio.src) {
          URL.revokeObjectURL(this.audio.src);
        }

        this.audio.src = audioUrl;
        this._currentTrack.set(track);
        this.updateStatus({
          currentTrackId: track.id,
          currentTime: 0,
          duration: 0,
          state: 'buffering',
        });

        const index = this._queue().findIndex((t) => t.id === track.id);
        if (index !== -1) {
          this._queueIndex.set(index);
        }

        this.audio.play().catch(() => this.updateStatus({ state: 'stopped' }));
      });
  }

  private handleTrackEnd(): void {
    const repeatMode = this._status().repeatMode;

    if (repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => this.updateStatus({ state: 'stopped' }));
    } else {
      this.next();
    }
  }

  private updateStatus(partial: Partial<PlayerStatus>): void {
    this._status.update((status) => ({ ...status, ...partial }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.audio.src) {
      URL.revokeObjectURL(this.audio.src);
    }
  }
}
