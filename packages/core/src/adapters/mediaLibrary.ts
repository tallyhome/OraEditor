export interface MediaItem {
  url: string;
  alt?: string;
  title?: string;
  type?: "image" | "video" | "audio";
}

export interface MediaLibraryOptions {
  multiple?: boolean;
  types?: Array<"image" | "video" | "audio">;
}

export interface MediaLibraryAdapter {
  openMediaLibrary: (opts?: MediaLibraryOptions) => Promise<MediaItem[] | null>;
}
