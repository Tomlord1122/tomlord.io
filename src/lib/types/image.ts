export type ResponsiveImageType = {
	src: string;
	alt: string;
	loading?: 'lazy' | 'eager';
	onclick?: () => void;
};

export type UploadTarget = 'photography' | 'content';

export type ImageUploadModalType = {
	show: boolean;
	defaultTarget?: UploadTarget;
	onUploadSuccess: (filePaths: string[]) => void;
	onCancel: () => void;
};
