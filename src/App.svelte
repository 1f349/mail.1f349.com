<script lang="ts">
  import {getBearer, loginStore} from "./stores/login";
  import {openLoginPopup} from "./utils/login-popup";

  let mainWS: WebSocket;
  $: window.mainWS = mainWS;

  function connectWS() {
    mainWS = new WebSocket("wss://api.1f349.com/v1/lotus/imap");
    mainWS.addEventListener("open", () => {
      mainWS.send(JSON.stringify({token: getBearer().slice(7)}));
    });
  }

  function removeLoginSession() {
    $loginStore = null;
    localStorage.removeItem("login-session");
  }
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
      <button class="selected">Inbox</button>
      <button>Sent</button>
    </div>
    <div id="option-view">
      <div style="padding:8px;background-color:#bb7900;">Warning: This is currently still under development</div>
      <button on:click={() => connectWS()}>Connect WS</button>
    </div>
  {/if}
</main>

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
    height: calc(100% - 70px);

    #sidebar {
      width: 150px;
      min-width: 150px;

      button {
        background-color: #2c2c2c;
        border: none;
        box-shadow: none;
        box-sizing: border-box;
        color: tomato;
        cursor: pointer;
        font-size: 20px;
        font-weight: 700;
        line-height: 24px;
        width: 100%;
        height: 70px;

        &:hover {
          background-color: #1c1c1c;
        }

        &.selected {
          background-color: #1c1c1c;
        }
      }
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
</style>
