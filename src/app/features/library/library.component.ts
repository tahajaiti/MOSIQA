import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideSearch,
  lucideFilter,
  lucideMusic,
  lucideX,
  lucideLoader,
} from '@ng-icons/lucide';
import { Track, MusicCategory, MUSIC_CATEGORIES, TrackFormData } from '@core/models';
import { TrackService, ToastService } from '@core/services';
import {
  TrackCardComponent,
  TrackFormComponent,
  ConfirmDialogComponent,
  TrackFormOutput,
} from '@shared/components';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [FormsModule, NgIcon, TrackCardComponent, TrackFormComponent, ConfirmDialogComponent],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css',
  viewProviders: [
    provideIcons({
      lucidePlus,
      lucideSearch,
      lucideFilter,
      lucideMusic,
      lucideX,
      lucideLoader,
    }),
  ],
})
export class LibraryComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly router = inject(Router);

  protected readonly trackService = inject(TrackService);
  protected readonly toastService = inject(ToastService);

  protected searchQuery = signal('');
  protected selectedCategory = signal<MusicCategory | 'all'>('all');
  protected showAddModal = signal(false);
  protected showEditModal = signal(false);
  protected showDeleteConfirm = signal(false);
  protected editingTrack = signal<Track | null>(null);
  protected deletingTrack = signal<Track | null>(null);
  protected isSubmitting = signal(false);

  protected readonly categories = MUSIC_CATEGORIES;

  protected filteredTracks = computed(() => {
    let tracks = this.trackService.tracks();
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    if (query) {
      tracks = tracks.filter(
        (t) => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query),
      );
    }

    if (category !== 'all') {
      tracks = tracks.filter((t) => t.category === category);
    }

    return tracks;
  });

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openAddModal(): void {
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  openEditModal(track: Track): void {
    this.editingTrack.set(track);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingTrack.set(null);
  }

  openDeleteConfirm(track: Track): void {
    this.deletingTrack.set(track);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deletingTrack.set(null);
  }

  viewTrackDetails(track: Track): void {
    this.router.navigate(['/track', track.id]);
  }

  onAddTrack(data: TrackFormOutput): void {
    if (!data.audioFile) {
      this.toastService.error('Audio file is required');
      return;
    }

    this.isSubmitting.set(true);
    const formData: TrackFormData = {
      title: data.title,
      artist: data.artist,
      description: data.description,
      category: data.category,
      audioFile: data.audioFile,
      coverImage: data.coverImage,
    };

    this.trackService
      .createTrack(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting.set(false);
          if (result) {
            this.toastService.success('Track added successfully');
            this.closeAddModal();
          } else {
            this.toastService.error(this.trackService.error() ?? 'Failed to add track');
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error('Failed to add track');
        },
      });
  }

  onUpdateTrack(data: TrackFormOutput): void {
    const track = this.editingTrack();
    if (!track) return;

    this.isSubmitting.set(true);

    this.trackService
      .updateTrack(track.id, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting.set(false);
          if (result) {
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
    const track = this.deletingTrack();
    if (!track) return;

    this.trackService
      .deleteTrack(track.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success('Track deleted successfully');
            this.closeDeleteConfirm();
          } else {
            this.toastService.error(this.trackService.error() ?? 'Failed to delete track');
          }
        },
        error: () => {
          this.toastService.error('Failed to delete track');
        },
      });
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }
}
