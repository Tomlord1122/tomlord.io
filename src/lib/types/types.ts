export interface PostMetadata {
  title: string;
  date: string;
  slug: string;
  description: string;
  tags: string[];
  lang: string;
}

// Using Omit to define Post based on PostMetadata
export interface Post extends Omit<PostMetadata, "description"> {
  content: any; // or more precisely SvelteComponent type, if easily available
  duration: string;
}
