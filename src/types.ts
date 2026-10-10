export interface MediaVariant {
  type: string;
  url: string;
  width?: number;
  height?: number;
}

export interface Media {
  id: string;
  width: number;
  height: number;
  file_url: string;
  preview_url: string;
  sample_url?: string;
  tags: string;
  rating: string;
  score: number;
  owner?: string;
  variants?: MediaVariant[];
}

