import type { GameState, Player } from "../game/types";

export type MoveScore = { index: number; value: number };

export type AIMoveOptions = {
  /** Training uses ε-greedy; play mode is greedy */
  training: boolean;
  epsilon: number;
};

export type AIMoveResult = {
  index: number;
  scores: MoveScore[];
};

export interface AIMoveSelector {
  suggestMove(
    state: GameState,
    rng: () => number,
    options: AIMoveOptions,
  ): AIMoveResult;

  /** Monte Carlo backup after one completed game */
  learnFromGame(
    trajectory: readonly GameStep[],
    outcomeForX: -1 | 0 | 1,
  ): void;

  getMoveValues(state: GameState): MoveScore[];
}

export type GameStep = {
  boardKey: string;
  player: Player;
  action: number;
};
