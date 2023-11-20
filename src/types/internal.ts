export interface TreeFolder {
  name: string;
  path: string;
  attr: Set<string>;
  children: TreeFolder[];
}

export interface RootFolder extends TreeFolder {
  role: string;
}

export interface FolderSelection {
  name: string;
  path: string;
}
