export interface RulePreviewFile {
  name : string;
  size : number;
  // Ordenar: the subfolder it would go to.
  into : string | null;
}

// What the rule would do with what is already in its folder, without doing it.
export interface RulePreview {
  files       : RulePreviewFile[];
  total       : number;
  bytes       : number;
  downloading : number;
  folderName  : string;
}
