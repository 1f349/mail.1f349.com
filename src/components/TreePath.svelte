<script lang="ts">
  import {slide} from "svelte/transition";
  import type {FolderSelection, RootFolder, TreeFolder} from "../types/internal";
  import {Archive, ChevronRight, Flame, Folder, Inbox, Send, Text, Trash2} from "lucide-svelte";
  import {createEventDispatcher} from "svelte";

  let folderIcons: {[key: string]: any} = {
    Inbox: Inbox,
    Drafts: Text,
    Sent: Send,
    Archive: Archive,
    Junk: Flame,
    Trash: Trash2,
  };

  const dispatch = createEventDispatcher();

  export let data: TreeFolder;
  let expanded: boolean = false;
  export let treeOffset: number = 0;
  export let selected: string = "";

  function isRootFolder(obj: any): obj is RootFolder {
    return "role" in obj;
  }

  function getFolderIcon(): any {
    if (isRootFolder(data)) return folderIcons[data.role];
    return Folder;
  }

  function getNextSelected(full: string): string {
    if (full.indexOf(data.name) != 0) return "";
    return full.slice(data.name.length + 1);
  }

  function triggerSelected(n?: FolderSelection) {
    dispatch("select", n == undefined ? {name: data.name, obj: data} : n);
  }
</script>

<div class="tree-item" class:expanded class:selected={selected === data.name} style="--tree-offset: {treeOffset};">
  <div class="tree-arrow" class:no-children={data.attr.has("\\HasNoChildren")}>
    <button on:click={() => (expanded = !expanded)}><ChevronRight /></button>
  </div>
  <button on:click={() => triggerSelected()} class="tree-icon"><svelte:component this={getFolderIcon()} /></button>
  <button on:click={() => triggerSelected()} class="tree-title"><div>{data.name}</div></button>
</div>
{#if expanded}
  <div class="tree-children" class:expanded transition:slide style="--tree-offset: {treeOffset};">
    {#each data.children as child (child.name)}
      <svelte:self
        data={child}
        treeOffset={treeOffset + 1}
        selected={getNextSelected(selected)}
        on:select={n => triggerSelected({name: data.name + "/" + n.detail.name, obj: n.detail.obj})}
      />
    {/each}
  </div>
{/if}

<style lang="scss">
  .tree-item {
    display: grid;
    grid-template-columns: 32px 32px auto;
    padding-left: calc(var(--tree-offset) * 32px);

    .tree-arrow {
      width: 32px;
      height: 32px;
      grid-column: 1;

      &.no-children {
        display: none;
      }

      > button {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 32px;
        height: 32px;
        background: transparent;
        border: none;
        padding: 0;
        margin: 0;
      }
    }

    .tree-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 32px;
      height: 32px;
      grid-column: 2;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
    }

    .tree-title {
      display: flex;
      justify-content: left;
      align-items: center;
      grid-column: 3;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;

      > div {
        white-space: nowrap;
        padding-inline: 8px;
      }
    }

    &.expanded > .tree-arrow > button {
      transform: rotate(90deg);
    }

    &:hover,
    &.selected {
      background-color: #1c1c1c;
    }
  }
</style>
