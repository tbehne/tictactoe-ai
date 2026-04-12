export type Player = "X" | "O";

export type Cell = null | Player;

export type GameStatus = "playing" | "win" | "tie";

export type GameState = {
  board: Cell[];
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  /** Board indices forming the winning line when status is win */
  winningLine: number[] | null;
};

export const BOARD_SIZE = 3;
export const BOARD_LEN = BOARD_SIZE * BOARD_SIZE;

export const LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function otherPlayer(p: Player): Player {
  return p === "X" ? "O" : "X";
}
