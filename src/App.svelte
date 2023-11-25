<script lang="ts">
  import {onMount} from "svelte";
  import {getBearer, loginStore} from "./stores/login";
  import {openLoginPopup} from "./utils/login-popup";
  import type {ImapMessage} from "./types/imap";
  import TreePath from "./components/TreePath.svelte";
  import MailView from "./components/MailView.svelte";
  import FolderView from "./components/FolderView.svelte";
  import {WS} from "./logic/ws";
  import {FolderManager, MailFolder} from "./logic/folder";
  import {MessageManager} from "./logic/message";

  let mainWS: WS;
  $: window.mainWS = mainWS;

  let fm: FolderManager = new FolderManager();
  let mm: MessageManager = new MessageManager();

  let inboxOption: string = "*";
  let inboxOptions: string[] = [];

  let messageList: Map<string, ImapMessage[]> = new Map();
  let messageLookup: Map<string, ImapMessage> = new Map();
  window.messageLookup = messageLookup;

  let currentFolder: MailFolder = fm.INBOX;
  let folderMessages: Promise<ImapMessage[]>;

  let currentMessage: ImapMessage | null = null;

  function changeSelectedFolder(p: MailFolder) {
    currentFolder = p;
    console.log("changeSelectedFolder", p);
    folderMessages = mm.fetchMessages(p.path, 1, 10, 10);
  }

  $: console.log("Selected", currentFolder);

  function removeLoginSession() {
    $loginStore = null;
    localStorage.removeItem("login-session");
  }

  onMount(() => {
    mainWS = new WS(import.meta.env.VITE_IMAP_LOTUS, getBearer().slice(7), fm, mm);
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
      {#each fm.ROOT as folder}
        <TreePath data={folder} selected={currentFolder.name} on:select={n => changeSelectedFolder(n.detail)} />
      {/each}
    </div>
    <div id="folder-view">
      {#await folderMessages}
        <div>Loading messages</div>
      {:then x}
        <FolderView folder={currentFolder} messages={x} />
      {/await}
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
    box-shadow:
      0 4px 8px #0003,
      0 6px 20px #00000030;
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

    #folder-view {
      box-sizing: border-box;
      overflow-y: auto;
      height: 100%;
      width: 250px;
      flex-grow: 1;
      flex-shrink: 0;
    }

    #message-view {
      box-sizing: border-box;
      overflow-y: auto;
      width: 100%;
      height: 100%;
      flex-grow: 1;
    }
  }

  footer {
    padding: 8px;
    background-color: #2c2c2c;
    box-shadow:
      0 -4px 8px #0003,
      0 -6px 20px #00000030;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
</style>
