export interface ImapFolder {
  Attributes: string[];
  Delimiter: string;
  Name: string;
}

export interface ImapMessage {
  $Body: unknown;
  BodyStructure: unknown;
  Envelope: ImapEnvelope;
  Flags: string[];
  InternalDate: string;
  Items: string[];
  SeqNum: number;
  Size: number;
  Uid: number;
}

export interface ImapEnvelope {
  Date: string;
  Subject: string;
  From: ImapPerson[];
  Sender: ImapPerson[];
  ReplyTo: ImapPerson[];
  To: ImapPerson[];
  Cc: ImapPerson[];
  Bcc: ImapPerson[];
  InReplyTo: string;
  MessageId: string;
}

export interface ImapPerson {
  PersonalName: string;
  AtDomainList: string;
  MailboxName: string;
  HostName: string;
}
