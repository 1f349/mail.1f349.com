import type {ImapFolder, ImapMessage} from "../types/imap";
import {countChar} from "../utils/count-char";
import type {FolderManager, RootMailFolder} from "./folder";
import {MailMessage, type MessageManager} from "./message";

export class WS {
  ws: WebSocket;
  fm: FolderManager;
  mm: MessageManager;

  constructor(address: string, token: string, fm: FolderManager, mm: MessageManager) {
    this.ws = new WebSocket(address);
    this.ws.addEventListener("open", () => {
      this.ws.send(JSON.stringify({token: token}));
    });
    this.ws.addEventListener("message", e => {
      this.handleMessage(e);
    });
    this.fm = fm;
    this.mm = mm;
    mm.setWS(this);
  }

  send(action: string, args: any) {
    this.ws.send(JSON.stringify({action, args}));
  }

  handleMessage(e: MessageEvent<any>) {
    let j = JSON.parse(e.data);
    if (j.auth === "ok") {
      this.ws.send(JSON.stringify({action: "list", args: ["", "*"]}));
    }
    if (j.type === "list") {
      // === Example output of list command ===
      // let j = {
      //   type: "list",
      //   value: [
      //     {Attributes: ["\\HasChildren", "\\UnMarked", "\\Archive"], Delimiter: "/", Name: "Archive"},
      //     {Attributes: ["\\HasNoChildren", "\\UnMarked", "\\Junk"], Delimiter: "/", Name: "Junk"},
      //     {Attributes: ["\\HasChildren", "\\Trash"], Delimiter: "/", Name: "Trash"},
      //     {Attributes: ["\\HasNoChildren", "\\UnMarked"], Delimiter: "/", Name: "INBOX/status"},
      //     {Attributes: ["\\HasNoChildren", "\\UnMarked"], Delimiter: "/", Name: "INBOX/hello"},
      //     {Attributes: ["\\HasNoChildren", "\\UnMarked"], Delimiter: "/", Name: "INBOX/hi"},
      //     {Attributes: ["\\Noselect", "\\HasChildren"], Delimiter: "/", Name: "INBOX/sub"},
      //     {Attributes: ["\\HasNoChildren"], Delimiter: "/", Name: "INBOX/sub/folder"},
      //     {Attributes: ["\\HasNoChildren", "\\UnMarked", "\\Drafts"], Delimiter: "/", Name: "Drafts"},
      //     {Attributes: ["\\HasNoChildren", "\\Sent"], Delimiter: "/", Name: "Sent"},
      //     {Attributes: ["\\HasChildren"], Delimiter: "/", Name: "INBOX"},
      //   ],
      // };

      let imapFolders = j.value as ImapFolder[];

      // Remove no-select folders
      imapFolders = imapFolders.filter(x => !x.Attributes.includes("\\Noselect"));
      // Sort shorter paths first so parent folders are registered before children
      imapFolders = imapFolders.sort((a, b) => countChar(a.Name, a.Delimiter) - countChar(b.Name, b.Delimiter));

      imapFolders.forEach(x => {
        this.fm.resolveFolder(x);
      });
    }
    if (j.type == "fetch") {
      // {
      //   type: "fetch",
      //   sync: 0,
      //   value: [
      //     {
      //       $Body: {},
      //       BodyStructure: null,
      //       Envelope: {
      //         Date: "2023-09-10T20:54:09-04:00",
      //         Subject: "This is an email subject",
      //         From: [{PersonalName: "A Cool User", AtDomainList: "", MailboxName: "test", HostName: "example.com"}],
      //         Sender: [{PersonalName: "A Cool User", AtDomainList: "", MailboxName: "test", HostName: "example.com"}],
      //         ReplyTo: [{PersonalName: "A Cool User", AtDomainList: "", MailboxName: "test", HostName: "example.com"}],
      //         To: [{PersonalName: "Internal", AtDomainList: "", MailboxName: "melon+hi", HostName: "example.org"}],
      //         Cc: null,
      //         Bcc: null,
      //         InReplyTo: "",
      //         MessageId: "\u003c950124.162336@example.com\u003e",
      //       },
      //       Flags: ["\\Seen", "nonjunk"],
      //       InternalDate: "2023-09-10T20:54:10-04:00",
      //       Items: ["UID", "FLAGS", "INTERNALDATE", "ENVELOPE"],
      //       SeqNum: 1,
      //       Size: 0,
      //       Uid: 18,
      //     }
      //   ]
      // };

      let imapMsg = j.value as ImapMessage[];
      this.mm.updateMessage(
        j.sync,
        imapMsg.map(x => new MailMessage(x)),
      );
    }
  }
}
