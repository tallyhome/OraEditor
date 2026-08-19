export interface UploadedAsset {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface UploadContext {
  source: "button" | "drop" | "clipboard" | "url";
}

export interface UploadAdapter {
  uploadImage: (file: File, ctx: UploadContext) => Promise<UploadedAsset>;
  uploadFile?: (file: File, ctx: UploadContext) => Promise<UploadedAsset>;
}

export const blobUploadAdapter: UploadAdapter = {
  async uploadImage(file) {
    return { url: URL.createObjectURL(file), alt: file.name };
  },
  async uploadFile(file) {
    return { url: URL.createObjectURL(file), alt: file.name };
  },
};
