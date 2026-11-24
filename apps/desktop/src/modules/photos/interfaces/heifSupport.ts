// What get_heif_support answers: Windows opens HEIC or AVIF itself, or FFmpeg is here to do it.
export interface HeifSupport {
  heic   : boolean;
  avif   : boolean;
  ffmpeg : boolean;
}
