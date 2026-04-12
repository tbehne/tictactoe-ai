import type { GameState, Player } from "../game/types";
import { legalMoves } from "../game/engine";
import { boardToKey } from "../game/engine";
import type {
  AIMoveOptions,
  AIMoveResult,
  AIMoveSelector,
  GameStep,
  MoveScore,
} from "./types";

function qKey(boardKey: string, player: Player, action: number): string {
  return `${boardKey}|${player}|${action}`;
}

export type TableModelConfig = {
  learningRate: number;
};

export class TableQModel implements AIMoveSelector {
  private readonly q = new Map<string, number>();
  learningRate: number;

  constructor(config: TableModelConfig = { learningRate: 0.2 }) {
    this.learningRate = config.learningRate;
  }

  /** Restore internal table (e.g. from persistence) */
  importQ(entries: Record<string, number>): void {
    this.q.clear();
    for (const [k, v] of Object.entries(entries)) {
      this.q.set(k, v);
    }
  }

  exportQ(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this.q) out[k] = v;
    return out;
  }

  getQ(boardKey: string, player: Player, action: number): number {
    return this.q.get(qKey(boardKey, player, action)) ?? 0;
  }

  getMoveValues(state: GameState): MoveScore[] {
    const boardKey = boardToKey(state.board);
    const moves = legalMoves(state);
    return moves.map((index) => ({
      index,
      value: this.getQ(boardKey, state.currentPlayer, index),
    }));
  }

  suggestMove(
    state: GameState,
    rng: () => number,
    options: AIMoveOptions,
  ): AIMoveResult {
    const scores = this.getMoveValues(state);
    const moves = scores.map((s) => s.index);
    if (moves.length === 0) {
      throw new Error("No legal moves");
    }
    if (options.training && rng() < options.epsilon) {
      const pick = moves[Math.floor(rng() * moves.length)]!;
      return { index: pick, scores };
    }
    let best = moves[0]!;
    let bestVal = this.getQ(
      boardToKey(state.board),
      state.currentPlayer,
      best,
    );
    for (const m of moves) {
      const v = this.getQ(
        boardToKey(state.board),
        state.currentPlayer,
        m,
      );
      if (v > bestVal) {
        bestVal = v;
        best = m;
      }
    }
    return { index: best, scores };
  }

  learnFromGame(
    trajectory: readonly GameStep[],
    outcomeForX: -1 | 0 | 1,
  ): void {
    const alpha = this.learningRate;
    for (const step of trajectory) {
      const target =
        step.player === "X" ? outcomeForX : (-outcomeForX as -1 | 0 | 1);
      const key = qKey(step.boardKey, step.player, step.action);
      const prev = this.q.get(key) ?? 0;
      this.q.set(key, prev + alpha * (target - prev));
    }
  }
}
