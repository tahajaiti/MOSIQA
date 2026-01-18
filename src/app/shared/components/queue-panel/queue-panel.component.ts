import { Component, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideX,
  lucideMusic,
  lucideListMusic,
  lucidePlay,
  lucideTrash2,
  lucideGripVertical,
} from '@ng-icons/lucide';
import { Track } from '@core/models';
import { AudioPlayerService, TrackService } from '@core/services';
import { DurationPipe } from '@shared/pipes';

@Component({
  selector: 'app-queue-panel',
  standalone: true,
  imports: [NgIcon, DurationPipe],
  templateUrl: './queue-panel.component.html',
  styleUrl: './queue-panel.component.css',
  viewProviders: [
    provideIcons({
      lucideX,
      lucideMusic,
      lucideListMusic,
      lucidePlay,
      lucideTrash2,
      lucideGripVertical,
    }),
  ],
})
export class QueuePanelComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  isOpen = input<boolean>(false);
  closed = output<void>();

  protected readonly audioPlayer = inject(AudioPlayerService);
  protected readonly trackService = inject(TrackService);

  protected coverUrls = signal<Map<string, string>>(new Map());

  ngOnInit(): void {
    this.loadCoverImages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.coverUrls().forEach((url) => URL.revokeObjectURL(url));
  }

  private loadCoverImages(): void {
    const queue = this.audioPlayer.queue();
    queue.forEach((track) => {
      if (track.coverImageId && !this.coverUrls().has(track.id)) {
        this.trackService
          .getCoverImageUrl(track.coverImageId)
          .pipe(takeUntil(this.destroy$))
          .subscribe((url) => {
            if (url) {
              this.coverUrls.update((map) => new Map(map).set(track.id, url));
            }
          });
      }
    });
  }

  getCoverUrl(trackId: string): string | null {
    return this.coverUrls().get(trackId) ?? null;
  }

  isCurrentTrack(track: Track): boolean {
    return this.audioPlayer.currentTrack()?.id === track.id;
  }

  playTrack(track: Track): void {
    this.audioPlayer.play(track);
  }

  removeFromQueue(event: MouseEvent, track: Track): void {
    event.stopPropagation();
    this.audioPlayer.removeFromQueue(track.id);
  }

  clearQueue(): void {
    this.audioPlayer.setQueue([]);
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
