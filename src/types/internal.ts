export interface TreeFolder {
  name: string;
  attr: Set<string>;
  children: TreeFolder[];
}

export interface RootFolder extends TreeFolder {
  role: string;
}
