export interface TreeFolder {
  name: string; // Local name
  path: string; // Global path
  attr: Set<string>;
  children: TreeFolder[];
}

export interface RootFolder extends TreeFolder {
  role: string;
}

export interface FolderSelection {
  name: string;
  obj: TreeFolder;
}
