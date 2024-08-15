<script lang="ts">
  import getPlayers, { type Player } from "./players";
  import { stores } from "./lib/stores";
  import { derived } from "svelte/store";
  import {
    calculatePositionColor,
    chunkedPlayers,
    currentPick,
    currentRound,
    findPlayer,
    togglePlayer,
  } from "./lib/helpers";

  import {
    calculateDraftMetrics,
    displayPercent,
    type DraftMetrics,
  } from "./lib/accuracy";

  let { keepers, currentTab, draft, ready } = stores;

  const playersList = (
    isDraft: boolean,
    drafted: Player[],
    keepers: Player[],
    players: Player[]
  ) => {
    if (!isDraft) {
      return players;
    }

    return [
      ...drafted,
      ...players.filter(
        (player) => !findPlayer(player, keepers) && !findPlayer(player, drafted)
      ),
    ];
  };

  // Derived store for currentPlayerSet
  const currentPlayerSet = derived(
    [keepers, currentTab, draft],
    ([$keepers, $currentTab, $draft], set: (value: Player[][]) => void) => {
      // Return the chunked player list
      (async () => {
        set(
          chunkedPlayers(
            playersList(
              $currentTab === "draft",
              $draft,
              $keepers,
              await getPlayers()
            )
          )
        );
      })();
    },
    [] // Initial value for currentPlayerSet
  );

  let metrics: DraftMetrics;

  $: {
    if ($currentTab === "draft") {
      metrics = calculateDraftMetrics($draft);
    }
  }

  const onClick = (player: Player) => () => {
    switch ($currentTab) {
      case "keepers":
        $keepers = togglePlayer(player, $keepers);
        break;
      case "draft":
        $draft = togglePlayer(player, $draft);
    }
  };
</script>

{#await ready}
  <p>loading...</p>
{:then}
  <header>
    <nav>
      {#each ["all players", "keepers", "draft"] as tab}
        <button
          on:click={() => ($currentTab = tab)}
          class:selected={$currentTab === tab}
        >
          {tab}
        </button>
      {/each}
    </nav>
    <nav>
      <button
        disabled={!$keepers.length}
        on:click={() =>
          confirm(`Clear all Keepers? (This will delete ${$keepers.length})`) &&
          ($keepers = [])}>Clear Keepers</button
      >
      <button
        disabled={!$draft.length}
        on:click={() =>
          confirm(
            `Clear all Drafted Players? (This will delete ${$draft.length})`
          ) && ($draft = [])}>Clear Draft</button
      >
    </nav>
  </header>
  <main>
    <div class="grid">
      {#each $currentPlayerSet as round}
        {#each round as player (player)}
          <button
            class="player"
            on:click={onClick(player)}
            class:player-selected={findPlayer(player, $keepers) ||
              findPlayer(player, $draft)}
            style="background-color: {calculatePositionColor(
              player.position.position
            )}"
            class:player-keeper={findPlayer(player, $keepers)}
            class:player-drafted={findPlayer(player, $draft)}
            disabled={$currentTab === "keepers" &&
              findPlayer(player, $draft) !== undefined}
          >
            <div class="player-meta">
              <p class="player-rank">
                #{player.rank}
              </p>
              <p class="player-position">{player.position.position}</p>
            </div>
            <p class="player-name">{player.name}</p>
            <div>
              <p>{player.team}</p>
            </div>
          </button>
        {/each}
      {/each}
    </div>
    {#if $currentTab !== "all players"}
      <aside>
        {#if $currentTab === "keepers"}
          <h2>Keepers ({$keepers.length})</h2>
          <div class="draft">
            {#each $keepers as player}
              <div class="draft-player">
                <div class="rank">{player.rank}</div>
                <div class="name">{player.name}</div>
              </div>
            {/each}
          </div>
        {/if}
        {#if $currentTab === "draft"}
          <div class="tab-header">
            <h2>Draft</h2>
            <div>
              <p>Round: {currentRound($draft)}</p>
              <p>Pick: {currentPick($draft)}</p>
            </div>
          </div>

          <div class="draft">
            {#each $draft as player, idx}
              <div class="draft-player">
                <div class="pick">{idx + 1}</div>
                <div
                  class="position"
                  style={`color: ${calculatePositionColor(player.position.position)}`}
                >
                  {player.position.position}
                </div>
                <div class="rank">{player.rank}</div>

                <div class="name">{player.name}</div>

                <div class="accuracy" style={`color: ${metrics[idx].color}`}>
                  {displayPercent(metrics[idx].accuracy)}%
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </aside>
    {/if}
  </main>
{/await}

<style>
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  p,
  h2 {
    margin: 0;
  }

  main {
    display: flex;
    justify-content: space-between;
  }

  aside {
    border-left: 2px solid #444;
    padding: 1rem;
    width: 20%;
    background: rgba(2, 2, 2, 0.9);
    backdrop-filter: blur(0.5px);
  }

  aside h2 {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 1rem;
    border-bottom: 2px solid #444;
    display: flex;
    justify-content: space-between;
  }

  .player-keeper {
    filter: grayscale(1) brightness(0.6);
  }
  .player-keeper::before {
    content: "Keeper";
    background: rgba(255, 255, 255, 0.6);
    color: #000;
    padding: 0;
    font-size: 0.5rem;
    width: 100%;
    text-transform: uppercase;
  }
  aside .draft {
    display: flex;
    width: 100%;
    flex-direction: column;
    min-width: 200px;
  }

  aside .draft-player {
    padding: 0.1rem;
    border: 1px solid #444;
    display: grid;
    grid-template-columns: 0.5fr 1fr 1fr 4fr 1fr;
    width: 100%;

    align-items: center;
    font-size: small;
  }

  @media (max-width: 1092px) {
    main {
      flex-direction: column;
    }

    aside {
      border-left: 0;
      border-top: 2px solid #444;
      padding-top: 1rem;
      width: calc(100% - 2rem);
      position: sticky;
      bottom: 0;
      max-height: 20vh;
      overflow-y: auto;
    }
  }

  .grid {
    margin: 1rem;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1px;
    place-items: center;
  }

  .player {
    border-radius: 4px;
    color: #fff;
    height: 90px;
    width: 90px;

    appearance: none;
    padding: 5px;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid #222;
    margin: 0px;
    cursor: pointer;
    background: transparent;
  }
  .player-selected {
    filter: grayscale(0.5) brightness(0.6);
  }

  .player > p {
    font-size: 0.9rem;
    text-align: center;
  }

  .player-name {
    font-weight: 500;
  }

  .player-meta {
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
  }

  header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    border-bottom: 2px solid #444;
    margin-top: 1rem;
    flex-wrap: nowrap;
  }

  nav {
    margin-left: 1rem;
    margin-right: 1rem;
    display: flex;
  }

  nav button {
    border: 0;
    font-size: large;
    background: transparent;
    border-top: 2px solid #444;
    border-left: 2px solid #444;
    padding: 0.5rem 1rem;
    cursor: pointer;
    color: #fff;
    text-transform: lowercase;
  }

  nav button:last-child {
    border-right: 2px solid #444;
  }

  nav button.selected {
    background: #444;
  }

  @media (max-width: 1091px) {
    header nav button {
      font-size: small;
      padding: 0.5rem 0.5rem;
    }
    .player {
      height: 60px;
      width: 60px;
      padding: 2px;
      font-size: 0.5rem;
    }
    .player > p {
      font-size: 0.7rem;
      font-weight: 400;
    }
    .player-meta {
      font-size: 0.5rem;
    }
  }
</style>
