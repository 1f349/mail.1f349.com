<script lang="ts">
  import {onMount} from "svelte";
  import {getBearer, loginStore} from "./stores/login";
  import {openLoginPopup} from "./utils/login-popup";
  import type {ImapFolder, ImapMessage} from "./types/imap";
  import type {TreeFolder, RootFolder, FolderSelection} from "./types/internal";
  import TreePath from "./components/TreePath.svelte";
  import MailView from "./components/MailView.svelte";
  import FolderView from "./components/FolderView.svelte";
  import type {Folders} from "lucide-svelte";

  let mainWS: WebSocket;
  $: window.mainWS = mainWS;

  // Setup root folders
  let INBOX: RootFolder = {role: "Inbox", name: "Inbox", path: "INBOX", attr: new Set(), children: []};
  let DRAFTS: RootFolder = {role: "Drafts", name: "Drafts", path: "", attr: new Set(["\\Drafts"]), children: []};
  let SENT: RootFolder = {role: "Sent", name: "Sent", path: "", attr: new Set(["\\Sent"]), children: []};
  let ARCHIVE: RootFolder = {role: "Archive", name: "Archive", path: "", attr: new Set(["\\Archive"]), children: []};
  let JUNK: RootFolder = {role: "Junk", name: "Junk", path: "", attr: new Set(["\\Junk"]), children: []};
  let TRASH: RootFolder = {role: "Trash", name: "Trash", path: "", attr: new Set(["\\Trash"]), children: []};

  // Setup map to find special folders
  let ROOT: Map<string, RootFolder> = new Map();
  ROOT.set("Drafts", DRAFTS);
  ROOT.set("Sent", SENT);
  ROOT.set("Archive", ARCHIVE);
  ROOT.set("Junk", JUNK);
  ROOT.set("Trash", TRASH);

  let folders: RootFolder[] = [];
  let inboxOption: string = "*";
  let inboxOptions: string[] = [];

  let messageList: Map<string, ImapMessage[]> = new Map();
  let messageLookup: Map<string, ImapMessage> = new Map();
  window.messageLookup = messageLookup;

  let currentFolder: FolderSelection = {name: "Inbox", obj: INBOX};
  let folderMessages: ImapMessage[] = [];
  $: folderMessages = messageList.get(currentFolder.obj.path);

  let currentMessage: ImapMessage | null = null;

  function changeSelectedFolder(p: FolderSelection) {
    currentFolder = p;
    grabFolderMessages(p.obj);
  }

  function grabFolderMessages(p: TreeFolder) {
    let msgs = messageList.get(p.path);
    if (msgs == undefined) {
      mainWS.send(JSON.stringify({action: "fetch", args: [p.path, "1", "10", "10"]}));
      return;
    }
    folderMessages = msgs;
  }

  $: console.log("Selected", currentFolder);

  function countChar(s: string, c: string) {
    let result = 0;
    for (let i = 0; i < s.length; i++) if (s[i] == c) result++;
    return result;
  }

  function connectWS() {
    mainWS = new WebSocket(import.meta.env.VITE_IMAP_LOTUS);
    mainWS.addEventListener("open", () => {
      mainWS.send(JSON.stringify({token: getBearer().slice(7)}));
    });
    mainWS.addEventListener("message", e => {
      let j = JSON.parse(e.data);
      if (j.auth === "ok") {
        mainWS.send(JSON.stringify({action: "list", args: ["", "*"]}));
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

        // Store reference to special folders
        let ROOTKEYS: Map<string, RootFolder> = new Map();

        imapFolders.forEach(x => {
          // Find inbox folder
          if (x.Name === "INBOX") {
            x.Attributes.forEach(x => {
              INBOX.attr.add(x);
            });
            ROOTKEYS.set(x.Name, INBOX);
            return; // continue imapFolders loop
          }

          // Test for all special folder attributes
          for (let [k, v] of ROOT.entries()) {
            if (x.Attributes.includes("\\" + k)) {
              v.name = x.Name;
              x.Attributes.forEach(x => {
                v.attr.add(x);
              });
              v.path = x.Name;
              // map name to root key
              ROOTKEYS.set(x.Name, v);
              return; // continue imapFolders loop
            }
          }

          let n = x.Name.indexOf(x.Delimiter);
          if (n == -1) {
            console.error("No parent folder wtf??", x.Name);
            return;
          }
          let parent = x.Name.slice(0, n);
          let pObj: TreeFolder | undefined = ROOTKEYS.get(parent);
          if (pObj == undefined) {
            console.error("Parent is not a root folder??", x.Name);
            return;
          }

          let pIdx = n + 1;

          for (let i = pIdx; i < x.Name.length; i++) {
            if (x.Name[i] != x.Delimiter) continue;
            // find child matching current slice
            let nextObj: TreeFolder | undefined = pObj?.children.find(x2 => {
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
          pObj.children.push({
            name: x.Name.slice(pIdx),
            path: x.Name,
            attr: new Set(x.Attributes),
            children: [],
          });
        });

        // output special folders in order
        folders = [INBOX, DRAFTS, SENT, ARCHIVE, JUNK, TRASH];
      }
      if (j.type == "fetch") {
        // {
        //   type: "fetch",
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
      }
    });
  }

  function removeLoginSession() {
    $loginStore = null;
    localStorage.removeItem("login-session");
  }

  onMount(() => {
    connectWS();
  });
</script>

<header>
  <div>
    <h1>🍉 Mail</h1>
  </div>
  <div class="flex-gap" />
  <div class="nav-link">
    <a href="https://status.1f349.com" target="_blank">Status</a>
  </div>
  {#if $loginStore == null}
    <div class="login-view">
      <button on:click={() => openLoginPopup()}>Login</button>
    </div>
  {:else}
    <div class="user-view">
      <img class="user-avatar" src={$loginStore.userinfo.picture} alt="{$loginStore.userinfo.name}'s profile picture" />
      <div class="user-display-name">{$loginStore.userinfo.name}</div>
      <button on:click={() => removeLoginSession()}>Logout</button>
    </div>
  {/if}
</header>
<main>
  {#if $loginStore == null}
    <div id="login-view">Please login to continue</div>
  {:else}
    <div id="sidebar">
      {#each folders as folder}
        <TreePath data={folder} selected={currentFolder.name} on:select={n => changeSelectedFolder(n.detail)} />
      {/each}
    </div>
    <div id="folder-view">
      <FolderView folder={currentFolder} messages={folderMessages} />
    </div>
    <div id="message-view">
      <div style="padding:8px;background-color:#bb7900;">Warning: This is currently still under development</div>
      {#if currentMessage != null}
        <MailView message={currentMessage} />
      {:else}
        <div style="padding:8px;">No message selected</div>
      {/if}
    </div>
  {/if}
</main>
<footer>
  <div class="meta-version">
    Version: <code>{import.meta.env.VITE_APP_VERSION}</code>
    , {import.meta.env.VITE_APP_LASTMOD}
  </div>
  <div>
    <a href="https://github.com/1f349/mail.1f349.com" target="_blank">Source</a>
  </div>
  <div>
    <label>
      <span>Inbox:</span>
      <select bind:value={inboxOption}>
        <option value="*">Default</option>
        {#each inboxOptions as inbox}
          <option value={inbox}>{inbox}</option>
        {/each}
      </select>
    </label>
  </div>
</footer>

<style lang="scss">
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 70px;
    padding: 0 32px;
    background-color: #2c2c2c;
    box-shadow: 0 4px 8px #0003, 0 6px 20px #00000030;
    gap: 16px;
    z-index: 1;
    position: relative;

    h1 {
      font-size: 32px;
      margin: 0;
    }

    .nav-link {
      font-size: 24px;
    }

    .flex-gap {
      flex-grow: 1;
    }

    .user-view {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 16px;

      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }
    }

    button,
    a {
      background-color: transparent;
      border: none;
      box-shadow: none;
      box-sizing: border-box;
      color: tomato;
      cursor: pointer;
      font-size: 20px;
      font-weight: 700;
      line-height: 24px;
      padding: 8px;
      border-radius: 0.375rem;
    }
  }

  main {
    display: flex;
    flex-grow: 1;
    align-items: stretch;
    height: 0;

    #sidebar {
      width: auto;
      min-width: 250px;
      overflow-y: auto;
    }

    #login-view {
      padding: 16px;
    }

    #option-view {
      box-sizing: border-box;
      overflow-y: auto;
      height: 100%;
      flex-grow: 1;
    }
  }

  footer {
    padding: 8px;
    background-color: #2c2c2c;
    box-shadow: 0 -4px 8px #0003, 0 -6px 20px #00000030;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
</style>
