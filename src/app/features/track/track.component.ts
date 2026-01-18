import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subject, takeUntil, switchMap, of } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePlay,
  lucidePause,
  lucideMusic,
  lucideArrowLeft,
  lucidePencil,
  lucideTrash2,
  lucideClock,
  lucideCalendar,
  lucideDisc,
  lucideUser,
  lucideFileAudio,
  lucideX,
  lucideListPlus,
} from '@ng-icons/lucide';
import { Track, MUSIC_CATEGORIES } from '@core/models';
import { TrackService, AudioPlayerService, ToastService } from '@core/services';
import { TrackFormComponent, ConfirmDialogComponent, TrackFormOutput } from '@shared/components';
import { DurationPipe } from '@shared/pipes';

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [RouterLink, DatePipe, NgIcon, DurationPipe, TrackFormComponent, ConfirmDialogComponent],
  templateUrl: './track.component.html',
  styleUrl: './track.component.css',
  viewProviders: [
    provideIcons({
      lucidePlay,
      lucidePause,
      lucideMusic,
      lucideArrowLeft,
      lucidePencil,
      lucideTrash2,
      lucideClock,
      lucideCalendar,
      lucideDisc,
      lucideUser,
      lucideFileAudio,
      lucideX,
      lucideListPlus,
    }),
  ],
})
export class TrackComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly trackService = inject(TrackService);
  protected readonly audioPlayer = inject(AudioPlayerService);
  protected readonly toastService = inject(ToastService);

  protected track = signal<Track | null>(null);
  protected coverUrl = signal<string | null>(null);
  protected isLoading = signal(true);
  protected showEditModal = signal(false);
  protected showDeleteConfirm = signal(false);
  protected isSubmitting = signal(false);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.router.navigate(['/library']);
            return of(null);
          }
          this.isLoading.set(true);
          return this.trackService.getTrackById$(id);
        }),
      )
      .subscribe({
        next: (track) => {
          this.isLoading.set(false);
          if (track) {
            this.track.set(track);
            this.loadCoverImage(track);
          } else {
            this.router.navigate(['/library']);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to load track');
          this.router.navigate(['/library']);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    const url = this.coverUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  private loadCoverImage(track: Track): void {
    if (track.coverImageId) {
      this.trackService
        .getCoverImageUrl(track.coverImageId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((url) => {
          const oldUrl = this.coverUrl();
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
          }
          this.coverUrl.set(url);
        });
    } else {
      this.coverUrl.set(null);
    }
  }

  get categoryLabel(): string {
    const t = this.track();
    if (!t) return '';
    return MUSIC_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category;
  }

  get isCurrentTrack(): boolean {
    return this.audioPlayer.currentTrack()?.id === this.track()?.id;
  }

  get isPlaying(): boolean {
    return this.isCurrentTrack && this.audioPlayer.isPlaying();
  }

  get isInQueue(): boolean {
    const t = this.track();
    if (!t) return false;
    return this.audioPlayer.queue().some((q) => q.id === t.id);
  }

  togglePlay(): void {
    const t = this.track();
    if (!t) return;

    if (this.isPlaying) {
      this.audioPlayer.pause();
    } else {
      this.audioPlayer.play(t);
    }
  }

  addToQueue(): void {
    const t = this.track();
    if (!t || this.isInQueue) return;

    this.audioPlayer.addToQueue(t);
    this.toastService.success(`Added "${t.title}" to queue`);
  }

  openEditModal(): void {
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  openDeleteConfirm(): void {
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
  }

  onUpdateTrack(data: TrackFormOutput): void {
    const t = this.track();
    if (!t) return;

    this.isSubmitting.set(true);

    this.trackService
      .updateTrack(t.id, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting.set(false);
          if (result) {
            this.track.set(result);
            if (data.coverImage) {
              this.loadCoverImage(result);
            }
            this.toastService.success('Track updated successfully');
            this.closeEditModal();
          } else {
            this.toastService.error(this.trackService.error() ?? 'Failed to update track');
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error('Failed to update track');
        },
      });
  }

  onDeleteTrack(): void {
    const t = this.track();
    if (!t) return;

    this.trackService
      .deleteTrack(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success('Track deleted successfully');
            this.router.navigate(['/library']);
          } else {
            this.toastService.error(this.trackService.error() ?? 'Failed to delete track');
          }
        },
        error: () => {
          this.toastService.error('Failed to delete track');
        },
      });
  }
}
