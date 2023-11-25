import type {ImapEnvelope, ImapMessage} from "../types/imap";
import {in2mins} from "../utils/in2mins";
import type {WS} from "./ws";

export class MailMessage {
  expires: Date;
  __Body: unknown;
  Envelope: ImapEnvelope;
  Flags: Set<string> = new Set();
  InternalDate: Date;
  Items: string[];
  SeqNum: number;
  Size: number;
  Uid: number;

  constructor(m: ImapMessage) {
    this.expires = in2mins();
    this.__Body = m.$Body;
    this.Envelope = m.Envelope;
    m.Flags.forEach(x => this.Flags.add(x));
    this.InternalDate = new Date(m.InternalDate);
    this.Items = m.Items;
    this.SeqNum = m.SeqNum;
    this.Size = m.Size;
    this.Uid = m.Uid;
  }
}

export class MessageManager {
  ws?: WS;
  fetchCalls: Map<number, {path: string; trigger: (msgs: MailMessage[]) => void}> = new Map(); // key = unique
  store: Map<string, FolderMessageManager> = new Map(); // key = path -> seqnum

  setWS(ws: WS) {
    this.ws = ws;
    window.__mm_store = this.store;
  }

  fetchMessages(path: string, start: number, end: number, limit: number): Promise<MailMessage[]> {
    let now = Date.now();
    let s = this.store.get(path);
    if (s?.expires || 0 < now) {
      return new Promise((res, rej) => {
        this.fetchCalls.set(now, {
          path: path,
          trigger: (msgs: MailMessage[]) => {
            console.log("Fetch call triggered");
            res(msgs);
          },
        });
        this.ws?.send("fetch", {sync: now, path, start, end, limit});
      });
    }

    return Promise.resolve([...(s?.store.values() || [])]);
  }

  fetchFolder(path: string): Promise<MailMessage[]> {
    return this.fetchMessages(path, 1, 100, 100);
  }

  updateMessage(sync: number, m: MailMessage[]) {
    let call = this.fetchCalls.get(sync);
    if (!call) return;
    this.fetchCalls.delete(sync);
    let s = this.store.get(call.path);
    if (!s) {
      s = new FolderMessageManager();
      this.store.set(call.path, s);
    }
    s.saveIncomingMessages(m);
    call.trigger([...s.store.values()]);
  }
}

export class FolderMessageManager {
  expires: Date = in2mins();
  store: Map<number, MailMessage> = new Map(); // key = seqnum

  saveIncomingMessages(m: MailMessage[]) {
    m.forEach(x => this.store.set(x.SeqNum, x));
  }
}
