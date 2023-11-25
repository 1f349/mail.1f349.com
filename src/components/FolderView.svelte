<script lang="ts">
  import type {MailFolder} from "../logic/folder";
  import type {ImapMessage} from "../types/imap";

  export let folder: MailFolder;
  export let messages: ImapMessage[];
</script>

<h2>{folder.name}</h2>
{#if messages}
  {#each messages as msg}
    <div class="msg">
      <h3>{msg.Envelope.Subject}</h3>
      <h3>{msg.Envelope.From}</h3>
      <h3>{msg.Envelope.Date}</h3>
    </div>
  {/each}
{/if}

<style lang="scss">
  .msg {
    border-bottom: 1px solid white;
  }
</style>
