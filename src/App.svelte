<script lang="ts">
import { derived } from 'svelte/store';
import {
  calculatePositionColor,
  chunkedPlayers,
  currentPick,
  currentRound,
  findPlayer,
  jeffSorted,
  togglePlayer,
} from './lib/helpers';
import RankingArrow from './lib/RankingArrow.svelte';
import { stores } from './lib/stores';
import players, { type Player } from './players';

// biome-ignore lint/correctness/noUnusedVariables: used in template {#await ready}
let { keepers, currentTab, draft, ready } = stores;

const playersList = (isDraft: boolean, drafted: Player[], keepers: Player[]) => {
  if (!isDraft) {
    return players;
  }

  return [
    ...drafted,
    ...players.filter((player) => !findPlayer(player, keepers) && !findPlayer(player, drafted)),
  ];
};

const JEFF_TAB = "jeff's top 200";
const TABS = ['all players', JEFF_TAB, 'keepers', 'draft'];

const currentPlayerSet = derived([keepers, currentTab, draft], () => {
  if ($currentTab === JEFF_TAB) {
    return chunkedPlayers(jeffSorted(players));
  }
  return chunkedPlayers(playersList($currentTab === 'draft', $draft, $keepers));
}, []);

const onClick = (player: Player) => () => {
  switch ($currentTab) {
    case 'keepers':
      $keepers = togglePlayer(player, $keepers);
      break;
    case 'draft':
      $draft = togglePlayer(player, $draft);
  }
};

const clearKeepers = () => {
  if (!$keepers.length) return;
  if (!confirm(`Clear all Keepers? (This will delete ${$keepers.length})`)) return;
  $keepers = [];
};

const clearDraft = () => {
  if (!$draft.length) return;
  if (!confirm(`Clear all Drafted Players? (This will delete ${$draft.length})`)) return;
  $draft = [];
};
</script>

{#await ready}
  <p>loading...</p>
{:then}
  <header>
    <div role="tablist" aria-label="Player views">
      {#each TABS as tab}
        <button
          role="tab"
          aria-selected={$currentTab === tab}
          onclick={() => ($currentTab = tab)}
          class:selected={$currentTab === tab}
        >
          {tab}
        </button>
      {/each}
    </div>
    <div class="header-right">
      <button class="legend-toggle" title="Arrows show ranking disagreement between sources. Longer arrow = more variance." aria-label="Legend: arrows show ranking disagreement">?</button>
      {#if $currentTab === "keepers" || $currentTab === "draft"}
        <nav aria-label="Data actions">
          {#if $currentTab === "keepers"}
            <button
              disabled={!$keepers.length}
              onclick={clearKeepers}>Clear ({$keepers.length || 0})</button
            >
          {:else if $currentTab === "draft"}
            <button
              disabled={!$draft.length}
              onclick={clearDraft}>Clear ({$draft.length || 0})</button
            >
          {/if}
        </nav>
      {/if}
    </div>
  </header>
  <main>
    <div class="grid" class:grid-readonly={$currentTab === "all players" || $currentTab === JEFF_TAB}>
      {#each $currentPlayerSet as round}
        {#each round as player (player.rank)}
          <button
            class="player"
            onclick={onClick(player)}
            class:player-selected={findPlayer(player, $keepers) ||
              findPlayer(player, $draft)}
            style="background-color: {calculatePositionColor(
              player.position.position
            )}"
            class:player-keeper={findPlayer(player, $keepers)}
            class:player-drafted={findPlayer(player, $draft)}
            disabled={$currentTab === "keepers" &&
              findPlayer(player, $draft) !== undefined}
            title="{player.name} — Variance: {player.variance || 0}"
          >
            <span class="player-meta">
              <span class="player-rank">#{player.rank}</span>
              <span class="player-pos">{player.position.position}</span>
              <span class="player-team">{player.team}</span>
            </span>
            <span class="player-name" style="--name-scale: {Math.max(0.75, 1 - (Math.max(...player.name.split(' ').map(w => w.length)) - 7) * 0.055)}">{player.name}</span>
          </button>
        {/each}
      {/each}
    </div>
    {#if $currentTab === "keepers" || $currentTab === "draft"}
      <aside>
        {#if $currentTab === "keepers"}
          <h2>Keepers ({$keepers.length})</h2>
          <div class="draft">
            {#each $keepers as player}
              <div class="draft-player" title="Variance: {player.variance || 0}">
                <div class="rank">{player.rank}</div>
                <div class="name">{player.name}</div>
                <div class="compass-small">
                  <RankingArrow 
                    vector={player.vector} 
                    consensusStrength={player.consensusStrength}
                    size={14}
                  />
                </div>
              </div>
            {:else}
              <p class="empty-hint">Click players in the grid to mark them as keepers.</p>
            {/each}
          </div>
        {/if}
        {#if $currentTab === "draft"}
          <h2>Draft <span class="draft-info">R{currentRound($draft)} · P{currentPick($draft)}</span></h2>

          <div class="draft">
            {#each $draft as player, idx}
              <div class="draft-player" title="Variance: {player.variance || 0}">
                <div class="rank">{idx + 1}</div>
                <div class="name">{player.name}</div>
                <div class="compass-small">
                  <RankingArrow 
                    vector={player.vector} 
                    consensusStrength={player.consensusStrength}
                    size={14}
                  />
                </div>
              </div>
            {:else}
              <p class="empty-hint">Click players in the grid as they are drafted to track the draft board.</p>
            {/each}
          </div>
        {/if}
      </aside>
    {/if}
  </main>
{/await}

<style>
  /* ---- reset ---- */
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  p,
  h2 {
    margin: 0;
  }

  /* ---- header ---- */
  header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    border-bottom: 2px solid #444;
    padding: 0.25rem 0;
    position: sticky;
    top: 0;
    z-index: 10;
    background: #242424;
    flex-wrap: nowrap;
  }

  [role="tablist"] {
    display: flex;
  }

  [role="tablist"] button {
    border: 0;
    background: transparent;
    color: #888;
    padding: 0.3rem 0.75rem;
    font-size: 0.78rem;
    cursor: pointer;
    font-weight: 500;
    transition: color 0.15s, box-shadow 0.15s;
    border-radius: 4px;
    margin-right: 2px;
  }

  [role="tablist"] button:hover {
    color: #ccc;
  }

  [role="tablist"] button.selected {
    color: #fff;
    box-shadow: inset 0 -2px 0 #fff;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-toggle {
    background: none;
    border: 1px solid #555;
    color: #999;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 0.65rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
    transition: color 0.15s, border-color 0.15s;
  }

  .legend-toggle:hover {
    color: #fff;
    border-color: #999;
  }

  nav {
    display: flex;
  }

  nav button {
    border: 1px solid #444;
    border-radius: 4px;
    font-size: 0.72rem;
    background: transparent;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    color: #999;
    transition: color 0.15s, border-color 0.15s;
  }

  nav button:hover:not(:disabled) {
    color: #fff;
    border-color: #777;
  }

  /* ---- main layout ---- */
  main {
    display: flex;
    justify-content: space-between;
    overflow: hidden;
  }

  /* ---- grid ---- */
  .grid {
    margin: 0.5rem;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 2px;
    place-items: stretch;
    flex: 1;
    min-width: 0;
  }

  /* ---- player card ---- */
  .player {
    border-radius: 3px;
    color: #fff;
    appearance: none;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      "meta"
      "name";
    border: 1px solid rgba(255,255,255,0.08);
    margin: 0;
    padding: clamp(1px, 0.3vw, 4px) clamp(2px, 0.5vw, 5px);
    cursor: pointer;
    background: transparent;
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    transition: filter 0.15s, box-shadow 0.15s;
  }

  .player:nth-child(12n) {
    border-bottom: 1px solid rgba(255,255,255,0.2);
  }

  .player:hover {
    filter: brightness(1.08);
    z-index: 2;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.12);
  }

  .player:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
    z-index: 3;
  }

  .grid-readonly .player {
    cursor: default;
  }

  .grid-readonly .player:hover {
    filter: none;
    box-shadow: none;
  }

  .player-meta {
    grid-area: meta;
    display: flex;
    gap: clamp(0.1rem, 0.5vw, 0.3rem);
    align-items: center;
    font-size: clamp(0.45rem, 1.8vw, 0.65rem);
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
  }

  .player-rank {
    opacity: 0.75;
  }

  .player-pos {
    opacity: 0.85;
  }

  .player-team {
    opacity: 0.55;
    margin-left: auto;
  }

  .player-name {
    grid-area: name;
    font-weight: 600;
    font-stretch: condensed;
    font-feature-settings: "ss02", "cv12", "cv13";
    font-size: calc(clamp(0.45rem, 0.95vw, 0.76rem) * var(--name-scale, 1));
    text-align: center;
    line-height: 1.15;
    align-self: center;
    letter-spacing: -0.04em;
    word-break: break-word;
  }

  /* ---- selected states ---- */
  .player-selected {
    opacity: 0.55;
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.5);
  }

  .player-keeper {
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.7);
    opacity: 0.5;
  }

  .player-keeper::after {
    content: "K";
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(255,255,255,0.85);
    color: #111;
    font-size: 0.45rem;
    font-weight: 700;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    line-height: 1;
  }

  .player-drafted {
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.5);
    opacity: 0.5;
  }

  /* ---- sidebar ---- */
  aside {
    border-left: 1px solid #444;
    padding: 0.75rem;
    width: min(200px, 18%);
    background: #1a1a1a;
    flex-shrink: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }

  aside h2 {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid #444;
    padding-bottom: 0.35rem;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .draft-info {
    font-size: 0.65rem;
    font-weight: 400;
    color: #888;
  }

  aside .draft {
    display: grid;
    width: 100%;
  }

  aside .draft-player {
    padding: 2px 4px;
    border: 1px solid #333;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  aside .draft-player .name {
    font-weight: 500;
    text-align: center;
    font-size: 0.7rem;
    line-height: 1.2;
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }

  aside .draft-player .rank {
    font-size: 0.6rem;
    font-weight: 500;
    color: #888;
  }

  aside .draft-player .compass-small {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .empty-hint {
    color: #666;
    font-size: 0.7rem;
    font-style: italic;
    padding: 0.35rem 0;
  }

  /* ---- responsive ---- */
  @media (max-width: 1091px) {
    main {
      flex-direction: column;
    }

    aside {
      border-left: 0;
      border-top: 1px solid #444;
      padding: 0.5rem 0.75rem;
      width: calc(100% - 1.5rem);
      position: sticky;
      bottom: 0;
      max-height: 15vh;
      overflow-y: auto;
      background: #1a1a1a;
    }

    aside h2 {
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
      padding-bottom: 0.25rem;
    }

    aside .draft {
      grid-auto-flow: column;
      grid-template-rows: repeat(6, minmax(0, 1fr));
    }

    aside .draft-player .name {
      font-size: 0.6rem;
    }

    nav button {
      font-size: 0.65rem;
      padding: 0.3rem 0.5rem;
    }
  }

  @media (max-width: 768px) {
    .grid {
      margin: 0.25rem;
    }

    .player-name {
      font-stretch: normal;
      letter-spacing: normal;
      font-size: clamp(0.5rem, 2.5vw, 0.7rem);
    }

    [role="tablist"] button {
      padding: 0.25rem 0.5rem;
      font-size: 0.7rem;
    }
  }

  @media (min-width: 1100px) {
    .player-name {
      font-size: calc(clamp(0.76rem, 1.5vw, 1.15rem) * var(--name-scale, 1));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .player,
    .player:hover,
    nav button,
    [role="tablist"] button,
    .legend-toggle {
      transition: none;
    }
  }
</style>
