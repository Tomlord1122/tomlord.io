export interface EditPageModalType {
	show: boolean;
	pageTitle: string;
	initialContent: string;
	pageName: string;
	availablePhotos?: string[];
	availableAssets?: string[];
	onSaved: (content?: string) => void;
	onCancel: () => void;
}
