declare module 'videojs-playlist';

export interface PlaylistItem {
  sources: {
    src: string;
    type: string;
  }[];
  poster?: string;
  title?: string;
}

declare module 'video.js' {
  interface Player {
    playlist(items?: PlaylistItem[]): PlaylistItem[];
    playlist: {
      currentItem(index?: number): number;
      next(): void;
      previous(): void;
      autoadvance(delay: number | null): void;
    };
  }
} 