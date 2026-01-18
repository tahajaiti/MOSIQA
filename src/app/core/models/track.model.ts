export type MusicCategory =
  | 'pop'
  | 'rock'
  | 'rap'
  | 'jazz'
  | 'classical'
  | 'electronic'
  | 'rnb'
  | 'country'
  | 'metal'
  | 'indie'
  | 'other';

export interface Track {
  id: string;
  title: string;
  artist: string;
  description?: string;
  category: MusicCategory;
  duration: number;
  audioFileId: string;
  coverImageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackFormData {
  title: string;
  artist: string;
  description?: string;
  category: MusicCategory;
  audioFile: File;
  coverImage?: File;
}

export const MUSIC_CATEGORIES: { value: MusicCategory; label: string }[] = [
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'rap', label: 'Rap' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Classical' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'rnb', label: 'R&B' },
  { value: 'country', label: 'Country' },
  { value: 'metal', label: 'Metal' },
  { value: 'indie', label: 'Indie' },
  { value: 'other', label: 'Other' },
];
