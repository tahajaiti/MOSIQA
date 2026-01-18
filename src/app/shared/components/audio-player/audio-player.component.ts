import { Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePlay,
  lucidePause,
  lucideSkipBack,
  lucideSkipForward,
  lucideVolume2,
  lucideVolumeX,
  lucideShuffle,
  lucideRepeat,
  lucideRepeat1,
  lucideMusic,
  lucideListMusic,
} from '@ng-icons/lucide';
import { AudioPlayerService, TrackService } from '@core/services';
import { DurationPipe } from '@shared/pipes';
import { QueuePanelComponent } from '../queue-panel/queue-panel.component';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [NgIcon, DurationPipe, QueuePanelComponent],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.css',
  viewProviders: [
    provideIcons({
      lucidePlay,
      lucidePause,
      lucideSkipBack,
      lucideSkipForward,
      lucideVolume2,
      lucideVolumeX,
      lucideShuffle,
      lucideRepeat,
      lucideRepeat1,
      lucideMusic,
      lucideListMusic,
    }),
  ],
})
export class AudioPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('progressBar') progressBar!: ElementRef<HTMLDivElement>;

  private readonly destroy$ = new Subject<void>();

  protected readonly audioPlayer = inject(AudioPlayerService);
  protected readonly trackService = inject(TrackService);

  protected coverUrl = signal<string | null>(null);
  protected showQueue = signal(false);
  private currentCoverId: string | null = null;

  ngOnInit(): void {
    this.watchCurrentTrack();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    const url = this.coverUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  private watchCurrentTrack(): void {
    let lastTrackId: string | null = null;

    setInterval(() => {
      const track = this.audioPlayer.currentTrack();
      if (track?.id !== lastTrackId) {
        lastTrackId = track?.id ?? null;
        this.loadCoverImage();
      }
    }, 100);
  }

  private loadCoverImage(): void {
    const track = this.audioPlayer.currentTrack();
    const coverId = track?.coverImageId;

    if (coverId === this.currentCoverId) return;
    this.currentCoverId = coverId ?? null;

    const oldUrl = this.coverUrl();
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }

    if (coverId) {
      this.trackService
        .getCoverImageUrl(coverId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((url) => this.coverUrl.set(url));
    } else {
      this.coverUrl.set(null);
    }
  }

  get repeatIcon(): string {
    const mode = this.audioPlayer.status().repeatMode;
    return mode === 'one' ? 'lucideRepeat1' : 'lucideRepeat';
  }

  get repeatActive(): boolean {
    return this.audioPlayer.status().repeatMode !== 'none';
  }

  get shuffleActive(): boolean {
    return this.audioPlayer.status().isShuffled;
  }

  togglePlay(): void {
    if (this.audioPlayer.isPlaying()) {
      this.audioPlayer.pause();
    } else {
      this.audioPlayer.play();
    }
  }

  toggleQueue(): void {
    this.showQueue.update((v) => !v);
  }

  closeQueue(): void {
    this.showQueue.set(false);
  }

  onProgressClick(event: MouseEvent): void {
    if (!this.progressBar) return;
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    this.audioPlayer.seekToPercent(Math.max(0, Math.min(100, percent)));
  }

  onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.audioPlayer.setVolume(parseFloat(input.value));
  }
}
