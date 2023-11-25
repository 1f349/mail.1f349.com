import type {ImapFolder} from "../types/imap";

export class MailFolder {
  name: string; // Local name
  path: string; // Global path
  attr: Set<string>;
  children: Array<MailFolder>;

  constructor(name: string, path: string, attr: Set<string>) {
    this.name = name;
    this.path = path;
    this.attr = attr;
    this.children = new Array();
  }

  addAttrs(a: string[]) {
    a.forEach(x => this.attr.add(x));
  }

  addChild(f: MailFolder) {
    this.children.push(f);
  }
}

export class RootMailFolder extends MailFolder {
  role: string;

  constructor(name: string, role: string, path: string, attr: Set<string>) {
    super(name, path, attr);
    this.role = role;
  }
}

export class FolderManager {
  public INBOX: RootMailFolder = new RootMailFolder("Inbox", "Inbox", "INBOX", new Set(""));
  public DRAFTS: RootMailFolder = new RootMailFolder("Drafts", "Drafts", "~", new Set(["\\Drafts"]));
  public SENT: RootMailFolder = new RootMailFolder("Sent", "Sent", "~", new Set(["\\Sent"]));
  public ARCHIVE: RootMailFolder = new RootMailFolder("Archive", "Archive", "~", new Set(["\\Archive"]));
  public JUNK: RootMailFolder = new RootMailFolder("Junk", "Junk", "~", new Set(["\\Junk"]));
  public TRASH: RootMailFolder = new RootMailFolder("Trash", "Trash", "~", new Set(["\\Trash"]));

  public ROOT = [this.INBOX, this.DRAFTS, this.SENT, this.ARCHIVE, this.JUNK, this.TRASH];
  private ROOT_SPECIAL = {
    Drafts: this.DRAFTS,
    Sent: this.SENT,
    Archive: this.ARCHIVE,
    Junk: this.JUNK,
    Trash: this.TRASH,
  };
  // Store reference to special folders
  private ROOT_PATHS: Map<string, RootMailFolder> = new Map();

  constructor() {}

  resolveFolder(x: ImapFolder) {
    // Find inbox folder
    if (x.Name === "INBOX") {
      this.INBOX.addAttrs(x.Attributes);
      this.ROOT_PATHS.set(x.Name, this.INBOX);
      return; // continue imapFolders loop
    }

    // Test for all special folder attributes
    for (let [k, v] of Object.entries(this.ROOT_SPECIAL)) {
      if (x.Attributes.includes("\\" + k)) {
        v.name = x.Name;
        x.Attributes.forEach(x => {
          v.attr.add(x);
        });
        v.path = x.Name;
        // map name to root key
        this.ROOT_PATHS.set(x.Name, v);
        return; // continue imapFolders loop
      }
    }

    let n = x.Name.indexOf(x.Delimiter);
    if (n == -1) {
      console.error("No parent folder wtf??", x.Name);
      return;
    }
    let parent = x.Name.slice(0, n);
    let pObj: MailFolder | undefined = this.ROOT_PATHS.get(parent);
    if (pObj == undefined) {
      console.error("Parent is not a root folder??", x.Name);
      return;
    }

    let pIdx = n + 1;

    for (let i = pIdx; i < x.Name.length; i++) {
      if (x.Name[i] != x.Delimiter) continue;
      // find child matching current slice
      let nextObj: MailFolder | undefined = pObj?.children.find(x2 => {
        // check if folder matches current slice
        return x2.name === x.Name.slice(pIdx, i);
      });
      // if no slice is found try a bigger slice
      if (nextObj == undefined) continue;

      // move into child folder
      pObj = nextObj;
      pIdx = i + 1;
    }

    // no parent was found at all
    if (pObj == undefined) {
      console.error("Parent folder does not exist??", x.Name);
      return;
    }

    // add child to current parent
    pObj.children.push(new MailFolder(x.Name.slice(pIdx), x.Name, new Set(x.Attributes)));
  }
}
