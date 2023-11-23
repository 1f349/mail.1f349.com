<script lang="ts">
  import type {ImapMessage} from "../types/imap";
  import type {FolderSelection} from "../types/internal";

  export let folder: FolderSelection;
  export let messages: ImapMessage[];
</script>

<code>
  <pre>{JSON.stringify(folder, null, 2)}</pre>
</code>
<code>
  <pre>{JSON.stringify(messages, null, 2)}</pre>
</code>

<style lang="scss">
</style>
