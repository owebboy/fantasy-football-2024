<script lang="ts">
  import players, { type Player } from "./players";
  import { writable } from "svelte/store";

  // chunk the players into 12 player chunks, each alternating chunk is reversed
  const chunkedPlayers: Player[][] = players.reduce(
    (acc: Player[][], player, idx) => {
      const chunkIdx = Math.floor(idx / 12);
      if (!acc[chunkIdx]) {
        acc[chunkIdx] = [];
      }
      acc[chunkIdx].push(player);
      return acc;
    },
    []
  );

  const selectedPlayers = writable<Player[]>([]);
</script>

<main>
  <div class="grid">
    {#each chunkedPlayers as round}
      <div class="round">
        {#each round as player}
          <button
            class="player"
            on:click={() => {
              selectedPlayers.update((players) => {
                // toggle the player in the selected players array
                if (players.includes(player)) {
                  return players.filter((p) => p !== player);
                }
                return [...players, player];
              });
            }}
            class:selected={$selectedPlayers.includes(player)}
            style="background-color: {player.position
              .split(' ')[0]
              .toLowerCase()}"
          >
            <div class="player-meta">
              <p class="player-rank">{player.rank}</p>
              <p class="player-position">{player.position}</p>
            </div>
            <p>{player.name}</p>
            <div>
              <p>{player.team}</p>
            </div>
          </button>
        {/each}
      </div>
    {/each}
  </div>
</main>

<style>
  main {
    padding: 1rem;
  }

  p {
    margin: 0;
  }
  .round {
    display: flex;
    justify-content: space-between;
  }

  .round:nth-child(even) {
    flex-direction: row-reverse;
  }

  .player {
    appearance: none;
    padding: 5px;
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid #aaa;
    margin: 2px;
    cursor: pointer;
    background: transparent;
  }

  .selected {
    background-color: white;
    color: #222;
    border-color: white;
  }

  .player > p {
    font-size: 1rem;
    text-align: center;
  }

  .player-meta {
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
  }
</style>
