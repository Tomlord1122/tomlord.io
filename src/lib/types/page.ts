export interface EditPageModalType {
  show: boolean;
  pageTitle: string;
  initialContent: string;
  pageName: string;
  onSaved: () => void;
  onCancel: () => void;
}