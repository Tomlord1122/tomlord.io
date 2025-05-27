
export type ResponsiveImageType = {
    src: string;
    alt: string;
    loading?: "lazy" | "eager";
    onclick?: () => void;
  } 


  export type ImageUploadModalType = {
     show: boolean;
     onUploadSuccess: (filePaths: string[]) => void;
     onCancel: () => void;
  }