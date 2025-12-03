export interface Ministore {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  numClips: number;
  created: Date;
}

export interface Clipping {
  id: number;
  book_id: number;
  caption: string | null;
  text: string | null;
  thumbnail: string | null;
  url: string | null;
  created: Date;
  num: number;
}

export interface CatalogOptions {
  title?: string;
  description?: string;
  layout?: 'portrait' | 'landscape';
  photosPerPage?: number;
  coverTitle?: string;
  coverSubtitle?: string;
  showCover?: boolean;
}
