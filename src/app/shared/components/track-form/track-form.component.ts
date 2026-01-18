import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMusic, lucideUpload, lucideImage, lucideX, lucideLoader } from '@ng-icons/lucide';
import { Track, MUSIC_CATEGORIES, MusicCategory } from '@core/models';
import {
  ALLOWED_AUDIO_FORMATS,
  ALLOWED_IMAGE_FORMATS,
  MAX_FILE_SIZE,
} from '@core/services/storage/storage.service';

export interface TrackFormOutput {
  title: string;
  artist: string;
  description?: string;
  category: MusicCategory;
  audioFile?: File;
  coverImage?: File;
}

@Component({
  selector: 'app-track-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIcon],
  templateUrl: './track-form.component.html',
  styleUrl: './track-form.component.css',
  viewProviders: [
    provideIcons({
      lucideMusic,
      lucideUpload,
      lucideImage,
      lucideX,
      lucideLoader,
    }),
  ],
})
export class TrackFormComponent implements OnInit {
  track = input<Track | null>(null);
  isLoading = input<boolean>(false);

  submitted = output<TrackFormOutput>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);

  form!: FormGroup;
  categories = MUSIC_CATEGORIES;

  audioFile = signal<File | null>(null);
  audioFileName = signal<string>('');
  audioError = signal<string>('');

  coverImage = signal<File | null>(null);
  coverPreview = signal<string>('');
  coverError = signal<string>('');

  ngOnInit(): void {
    const track = this.track();
    this.form = this.fb.group({
      title: [track?.title ?? '', [Validators.required, Validators.maxLength(50)]],
      artist: [track?.artist ?? '', [Validators.required, Validators.maxLength(50)]],
      description: [track?.description ?? '', [Validators.maxLength(200)]],
      category: [track?.category ?? 'other', [Validators.required]],
    });
  }

  get isEditMode(): boolean {
    return this.track() !== null;
  }

  get titleError(): string {
    const control = this.form.get('title');
    if (control?.hasError('required')) return 'Title is required';
    if (control?.hasError('maxlength')) return 'Title cannot exceed 50 characters';
    return '';
  }

  get artistError(): string {
    const control = this.form.get('artist');
    if (control?.hasError('required')) return 'Artist is required';
    if (control?.hasError('maxlength')) return 'Artist cannot exceed 50 characters';
    return '';
  }

  get descriptionError(): string {
    const control = this.form.get('description');
    if (control?.hasError('maxlength')) return 'Description cannot exceed 200 characters';
    return '';
  }

  get descriptionLength(): number {
    return this.form.get('description')?.value?.length ?? 0;
  }

  onAudioSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.audioError.set('');

    if (!ALLOWED_AUDIO_FORMATS.includes(file.type)) {
      this.audioError.set('Invalid format. Allowed: MP3, WAV, OGG');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.audioError.set('File size exceeds 10MB limit');
      return;
    }

    this.audioFile.set(file);
    this.audioFileName.set(file.name);
  }

  onCoverSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.coverError.set('');

    if (!ALLOWED_IMAGE_FORMATS.includes(file.type)) {
      this.coverError.set('Invalid format. Allowed: PNG, JPEG');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.coverError.set('Image size exceeds 10MB limit');
      return;
    }

    this.coverImage.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.coverPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeAudio(): void {
    this.audioFile.set(null);
    this.audioFileName.set('');
    this.audioError.set('');
  }

  removeCover(): void {
    this.coverImage.set(null);
    this.coverPreview.set('');
    this.coverError.set('');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.isEditMode && !this.audioFile()) {
      this.audioError.set('Audio file is required');
      return;
    }

    const formValue = this.form.value;
    this.submitted.emit({
      title: formValue.title,
      artist: formValue.artist,
      description: formValue.description || undefined,
      category: formValue.category,
      audioFile: this.audioFile() ?? undefined,
      coverImage: this.coverImage() ?? undefined,
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
