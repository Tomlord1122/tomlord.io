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


export interface NewPostModalType {
  show: boolean;
  allCurrentTags: string[];
  availableImages?: string[];
  // Changed from oncreated to onSaved for consistency with edit modal context
  onSaved: () => void;
  // Changed from oncancel to onCancel for consistency with edit modal context
  onCancel: () => void;
}

export interface EditPostModalType extends NewPostModalType {
  postData: any
}