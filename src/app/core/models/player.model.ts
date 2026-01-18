export type PlayerState = 'playing' | 'paused' | 'buffering' | 'stopped';

export interface PlayerStatus {
  state: PlayerState;
  currentTrackId: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: RepeatMode;
}

export type RepeatMode = 'none' | 'one' | 'all';

export const DEFAULT_PLAYER_STATUS: PlayerStatus = {
  state: 'stopped',
  currentTrackId: null,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  isShuffled: false,
  repeatMode: 'none',
};
