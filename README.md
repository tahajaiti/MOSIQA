# MOSIQA - Local Music Player

A modern, offline-first music player built with Angular 21 for managing and enjoying your local music collection.

![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=flat-square&logo=tailwindcss)
![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?style=flat-square&logo=reactivex)

## Features

- **Complete CRUD Operations**: Add, edit, view, and delete music tracks
- **Track Details Page**: Dedicated page for viewing full track information
- **Local Storage**: All data stored in IndexedDB - works completely offline
- **Audio Player**: Full-featured player with play, pause, next, previous, shuffle, and repeat
- **Volume Control**: Adjustable volume with mute toggle
- **Progress Bar**: Seekable progress bar for track navigation
- **Cover Images**: Optional cover art for each track (PNG, JPEG)
- **Category Filtering**: Organize tracks by genre (Pop, Rock, Rap, Jazz, etc.)
- **Search**: Quick search through your library by title or artist
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern black and crimson color scheme

## Tech Stack

- **Framework**: Angular 21 with standalone components
- **State Management**: Angular Signals + RxJS Observables
- **Styling**: Tailwind CSS 4
- **Storage**: IndexedDB via `idb` library
- **Icons**: Lucide icons via `@ng-icons/lucide`
- **Forms**: Reactive Forms with validation

## Project Structure

```
src/app/
├── core/
│   ├── models/
│   │   ├── database.model.ts    # IndexedDB schema
│   │   ├── player.model.ts      # Audio player state
│   │   ├── track.model.ts       # Track entity
│   │   └── index.ts
│   └── services/
│       ├── audio-player/        # Audio playback service
│       ├── storage/             # IndexedDB operations
│       ├── toast/               # Notifications
│       ├── track/               # Track CRUD service
│       └── index.ts
├── features/
│   ├── library/                 # Main library page
│   └── track/                   # Track detail page
├── layout/
│   ├── main-layout/             # App shell
│   └── navbar/                  # Navigation
├── shared/
│   ├── components/
│   │   ├── audio-player/        # Bottom player bar
│   │   ├── confirm-dialog/      # Confirmation modal
│   │   ├── toast/               # Toast notifications
│   │   ├── track-card/          # Track list item
│   │   └── track-form/          # Add/edit form
│   ├── pipes/
│   │   ├── duration.pipe.ts     # Format seconds to mm:ss
│   │   └── file-size.pipe.ts    # Format bytes
│   └── index.ts
├── app.config.ts
├── app.routes.ts
└── app.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/your-username/MOSIQA.git
cd MOSIQA
npm install
npm start
```

Open your browser at `http://localhost:4200`

## Usage

### Adding a Track

1. Click the "Add Track" button in the library
2. Fill in the required fields:
   - **Title** (required, max 50 characters)
   - **Artist** (required, max 50 characters)
   - **Category** (select genre)
   - **Audio File** (MP3, WAV, OGG - max 10MB)
3. Optionally add:
   - **Description** (max 200 characters)
   - **Cover Image** (PNG, JPEG - max 10MB)
4. Click "Add Track"

### Playing Music

- Click any track card to view details
- Click the play button overlay on track cards
- Use the bottom player bar for playback controls
- Adjust volume with the slider (desktop)

### Track Details

- Click on a track card or select "View Details" from the menu
- View full track information including duration, category, and add date
- Play, edit, or delete tracks from the detail page

### Editing/Deleting

- Hover over a track card and click the menu icon (⋮)
- Select "Edit" or "Delete"
- Or use the buttons on the track detail page

## File Constraints

| Type        | Formats       | Max Size |
| ----------- | ------------- | -------- |
| Audio       | MP3, WAV, OGG | 10MB     |
| Cover Image | PNG, JPEG     | 10MB     |

## Architecture

### Services with RxJS

All services use RxJS Observables for async operations:

```typescript
createTrack(formData: TrackFormData): Observable<Track | null> {
  return this.storageService.saveAudioFile(audioFileId, formData.audioFile).pipe(
    switchMap((saved) => {...}),
    tap((track) => this._tracks$.next([track, ...currentTracks])),
    catchError((error) => {...})
  );
}
```

### State Management

Combines Angular Signals with RxJS BehaviorSubject:

```typescript
private readonly _tracks$ = new BehaviorSubject<Track[]>([]);
readonly tracks$ = this._tracks$.asObservable();
readonly tracks = signal<Track[]>([]);

constructor() {
  this._tracks$.subscribe((tracks) => this.tracks.set(tracks));
}
```

### Lazy Loading

All routes are lazy-loaded:

```typescript
{
  path: 'library',
  loadComponent: () =>
    import('@features/library/library.component')
      .then((m) => m.LibraryComponent),
}
```