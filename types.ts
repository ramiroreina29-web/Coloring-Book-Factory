
export enum PageType {
  COVER = 'COVER',
  INTERIOR = 'INTERIOR',
  BACK_COVER = 'BACK_COVER'
}

export type AspectRatio = '1:1' | '3:4';
export type StyleMode = 'standard' | 'baby' | 'classic';
export type ArtStyle = 'kawaii' | 'mandala' | 'cartoon' | 'spooky' | 'fantasy' | 'pixel';

export interface BookConfig {
  title: string;
  topic: string;
  pageCount: number;
  artStyle: ArtStyle;
  aspectRatio: AspectRatio;
  styleMode: StyleMode;
  hasFrames: boolean;
}

export interface GeneratedPage {
  id: string;
  type: PageType;
  imageUrl: string;
  prompt: string;
  pageNumber?: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface BookState {
  config: BookConfig;
  pages: GeneratedPage[];
  isGenerating: boolean;
  currentStep: string;
}
