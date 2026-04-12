import type { GameState } from "../game/types";
import { applyMove, createInitialState, legalMoves } from "../game/engine";
import type { AIMoveSelector, AIMoveOptions, GameStep } from "./types";
import { boardToKey } from "../game/engine";

export type SelfPlayEpisodeResult = {
  finalState: GameState;
  trajectory: GameStep[];
  outcomeForX: -1 | 0 | 1;
};

export function playOneEpisode(
  ai: AIMoveSelector,
  rng: () => number,
  options: AIMoveOptions,
): SelfPlayEpisodeResult {
  let state = createInitialState();
  const trajectory: GameStep[] = [];
  while (state.status === "playing") {
    const boardKey = boardToKey(state.board);
    const player = state.currentPlayer;
    const { index } = ai.suggestMove(state, rng, options);
    trajectory.push({ boardKey, player, action: index });
    state = applyMove(state, index);
  }
  let outcomeForX: -1 | 0 | 1;
  if (state.status === "tie") outcomeForX = 0;
  else if (state.winner === "X") outcomeForX = 1;
  else outcomeForX = -1;
  return { finalState: state, trajectory, outcomeForX };
}

export type ChunkedSelfPlayOptions = {
  totalGames: number;
  chunkSize: number;
  ai: AIMoveSelector;
  rng: () => number;
  moveOptions: AIMoveOptions;
  onChunk: (info: {
    gamesPlayed: number;
    lastResult: SelfPlayEpisodeResult | null;
  }) => void;
  signal?: { aborted: boolean };
};

/**
 * Runs games in small chunks via setTimeout(0) so the UI thread can breathe.
 */
export function runSelfPlayChunked(
  opts: ChunkedSelfPlayOptions,
): Promise<{ gamesPlayed: number; aborted: boolean }> {
  const {
    totalGames,
    chunkSize,
    ai,
    rng,
    moveOptions,
    onChunk,
    signal,
  } = opts;
  return new Promise((resolve) => {
    let played = 0;
    let last: SelfPlayEpisodeResult | null = null;

    const step = () => {
      if (signal?.aborted) {
        resolve({ gamesPlayed: played, aborted: true });
        return;
      }
      const end = Math.min(played + chunkSize, totalGames);
      for (; played < end; played++) {
        if (signal?.aborted) break;
        last = playOneEpisode(ai, rng, moveOptions);
        ai.learnFromGame(last.trajectory, last.outcomeForX);
      }
      onChunk({ gamesPlayed: played, lastResult: last });
      if (played >= totalGames || signal?.aborted) {
        resolve({ gamesPlayed: played, aborted: Boolean(signal?.aborted) });
        return;
      }
      setTimeout(step, 0);
    };
    setTimeout(step, 0);
  });
}
