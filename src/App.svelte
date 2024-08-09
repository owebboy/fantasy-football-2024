<script lang="ts">
  import players, { type PlayerPosition, type Player } from "./players";
  import { writable } from "svelte/store";

  // chunk the players into 12 player chunks, each alternating chunk is reversed
  const chunkedPlayers: Player[][] = players
    .reduce((acc: Player[][], player, idx) => {
      const chunkIdx = Math.floor(idx / 12);
      if (!acc[chunkIdx]) {
        acc[chunkIdx] = [];
      }
      acc[chunkIdx].push(player);
      return acc;
    }, [])
    .map((round, idx) => (idx % 2 === 0 ? round : round.reverse()));

  const selectedPlayers = writable<Player[]>([]);
  const calculatePositionColor = (position: PlayerPosition["position"]) => {
    switch (position) {
      case "QB":
        return "#00509E";
      case "RB":
        return "#228B22";
      case "WR":
        return "#C60C30";
      case "TE":
        return "#FF8C00";
      case "DST":
        return "#6A0DAD";
      case "K":
        return "#333333";
      default:
        return "black";
    }
  };
</script>

<div class="grid">
  {#each chunkedPlayers as round, idx}
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
        style="background-color: {calculatePositionColor(
          player.position.position
        )}"
      >
        <div class="player-meta">
          <p class="player-rank">#{player.rank}</p>
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

<style>
  p {
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1px;
    place-items: center;
    width: 1080px;
    margin: 0 auto;
  }

  .player {
    border-radius: 4px;
    color: #fff;
    height: calc(90px);
    width: calc(90px);

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

  .selected {
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
</style>
