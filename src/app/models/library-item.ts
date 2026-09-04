export interface LibraryItem {
  title: string;
  description?: string;
  /** Path to a thumbnail image (png/jpg) under /assets */
  imagePath?: string;
  /** Path to a pdf file under /assets, or a full URL */
  pdfPath?: string;
  /** External link, e.g. a video or reference page */
  linkUrl?: string;
  linkLabel?: string;
  embedded?: boolean;
}
