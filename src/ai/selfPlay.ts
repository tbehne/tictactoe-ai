import type { GameState } from "../game/types";
import { applyMove, createInitialState } from "../game/engine";
import type { AIMoveSelector, AIMoveOptions, GameStep } from "./types";
import { boardToKey } from "../game/engine";
import { TableQModel } from "./tableModel";

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

export type SelfPlayBatchStats = {
  winsX: number;
  winsO: number;
  ties: number;
};

function addOutcome(stats: SelfPlayBatchStats, outcomeForX: -1 | 0 | 1): void {
  if (outcomeForX === 1) stats.winsX += 1;
  else if (outcomeForX === -1) stats.winsO += 1;
  else stats.ties += 1;
}

/**
 * Linear factor for game index `gameIndex` (0-based): 1 on the first game, 0 on the last.
 * Single-game batches use factor 1 for that game.
 */
export function linearDecayFactor(gameIndex: number, totalGames: number): number {
  if (totalGames <= 1) return 1;
  return 1 - gameIndex / (totalGames - 1);
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
    stats: SelfPlayBatchStats;
  }) => void;
  signal?: { aborted: boolean };
  /**
   * When true (and `ai` is a `TableQModel`), ε and learning rate scale linearly from
   * `epsilonStart` / `learningRateStart` down to 0 over the batch.
   */
  decayEpsilonAndAlpha?: boolean;
  epsilonStart?: number;
  learningRateStart?: number;
};

/**
 * Runs games in small chunks via setTimeout(0) so the UI thread can breathe.
 */
export function runSelfPlayChunked(
  opts: ChunkedSelfPlayOptions,
): Promise<{
  gamesPlayed: number;
  aborted: boolean;
  stats: SelfPlayBatchStats;
}> {
  const {
    totalGames,
    chunkSize,
    ai,
    rng,
    moveOptions,
    onChunk,
    signal,
    decayEpsilonAndAlpha = false,
    epsilonStart: epsilonStartOpt,
    learningRateStart: learningRateStartOpt,
  } = opts;

  const tableAi = ai instanceof TableQModel ? ai : null;
  const decay =
    Boolean(decayEpsilonAndAlpha) && tableAi !== null && totalGames >= 1;
  const lrAtBatchStart = tableAi?.learningRate ?? 0.2;
  const eps0 = epsilonStartOpt ?? moveOptions.epsilon;
  const lr0 = learningRateStartOpt ?? lrAtBatchStart;

  return new Promise((resolve) => {
    let played = 0;
    let last: SelfPlayEpisodeResult | null = null;
    const stats: SelfPlayBatchStats = { winsX: 0, winsO: 0, ties: 0 };

    const finish = (result: {
      gamesPlayed: number;
      aborted: boolean;
      stats: SelfPlayBatchStats;
    }) => {
      if (tableAi) tableAi.learningRate = lrAtBatchStart;
      resolve(result);
    };

    const step = () => {
      if (signal?.aborted) {
        finish({ gamesPlayed: played, aborted: true, stats: { ...stats } });
        return;
      }
      const end = Math.min(played + chunkSize, totalGames);
      for (; played < end; played++) {
        if (signal?.aborted) break;
        const factor = decay ? linearDecayFactor(played, totalGames) : 1;
        const epOpts: AIMoveOptions = decay
          ? { ...moveOptions, epsilon: eps0 * factor }
          : moveOptions;
        last = playOneEpisode(ai, rng, epOpts);
        if (decay) tableAi!.learningRate = lr0 * factor;
        addOutcome(stats, last.outcomeForX);
        ai.learnFromGame(last.trajectory, last.outcomeForX);
      }
      onChunk({ gamesPlayed: played, lastResult: last, stats: { ...stats } });
      if (played >= totalGames || signal?.aborted) {
        finish({
          gamesPlayed: played,
          aborted: Boolean(signal?.aborted),
          stats: { ...stats },
        });
        return;
      }
      setTimeout(step, 0);
    };
    setTimeout(step, 0);
  });
}
