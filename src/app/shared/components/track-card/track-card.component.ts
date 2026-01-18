import { Component, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePlay,
  lucidePause,
  lucideMusic,
  lucideMoreVertical,
  lucidePencil,
  lucideTrash2,
  lucideExternalLink,
  lucideListPlus,
} from '@ng-icons/lucide';
import { Track } from '@core/models';
import { AudioPlayerService, TrackService, ToastService } from '@core/services';
import { DurationPipe } from '@shared/pipes';

@Component({
  selector: 'app-track-card',
  standalone: true,
  imports: [NgIcon, DurationPipe],
  templateUrl: './track-card.component.html',
  styleUrl: './track-card.component.css',
  viewProviders: [
    provideIcons({
      lucidePlay,
      lucidePause,
      lucideMusic,
      lucideMoreVertical,
      lucidePencil,
      lucideTrash2,
      lucideExternalLink,
      lucideListPlus,
    }),
  ],
})
export class TrackCardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  track = input.required<Track>();

  edit = output<Track>();
  delete = output<Track>();
  viewDetails = output<Track>();

  protected readonly audioPlayer = inject(AudioPlayerService);
  protected readonly trackService = inject(TrackService);
  protected readonly toastService = inject(ToastService);

  protected coverUrl = signal<string | null>(null);
  protected showMenu = signal(false);

  ngOnInit(): void {
    this.loadCoverImage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    const url = this.coverUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  private loadCoverImage(): void {
    const coverId = this.track().coverImageId;
    if (coverId) {
      this.trackService
        .getCoverImageUrl(coverId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((url) => this.coverUrl.set(url));
    }
  }

  get isCurrentTrack(): boolean {
    return this.audioPlayer.currentTrack()?.id === this.track().id;
  }

  get isPlaying(): boolean {
    return this.isCurrentTrack && this.audioPlayer.isPlaying();
  }

  get isInQueue(): boolean {
    return this.audioPlayer.queue().some((t) => t.id === this.track().id);
  }

  togglePlay(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isPlaying) {
      this.audioPlayer.pause();
    } else {
      this.audioPlayer.play(this.track());
    }
  }

  onCardClick(): void {
    this.viewDetails.emit(this.track());
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showMenu.update((v) => !v);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  onAddToQueue(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMenu();
    if (!this.isInQueue) {
      this.audioPlayer.addToQueue(this.track());
      this.toastService.success(`Added "${this.track().title}" to queue`);
    }
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMenu();
    this.edit.emit(this.track());
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMenu();
    this.delete.emit(this.track());
  }

  onViewDetails(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMenu();
    this.viewDetails.emit(this.track());
  }
}
