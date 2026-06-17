export interface ArtworkProject {
  id: string;
  title: string;
  thumbnail: string;
  albumId?: string;
  description?: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}