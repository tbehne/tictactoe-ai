import type { Cell, Player } from "./types";
import { LINES } from "./types";

export type TerminalCheck = {
  status: "playing" | "win" | "tie";
  winner: Player | null;
  winningLine: number[] | null;
};

export function checkTerminal(board: Cell[]): TerminalCheck {
  for (const line of LINES) {
    const [a, b, c] = line;
    const v = board[a];
    if (v !== null && v === board[b] && v === board[c]) {
      return { status: "win", winner: v, winningLine: [...line] };
    }
  }
  if (board.every((c) => c !== null)) {
    return { status: "tie", winner: null, winningLine: null };
  }
  return { status: "playing", winner: null, winningLine: null };
}
