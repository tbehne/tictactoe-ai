import type { Cell, GameState, Player } from "./types";
import { BOARD_LEN, otherPlayer } from "./types";
import { checkTerminal } from "./winning";

export function createInitialState(): GameState {
  return {
    board: Array.from({ length: BOARD_LEN }, () => null as Cell),
    currentPlayer: "X",
    status: "playing",
    winner: null,
    winningLine: null,
  };
}

export function isValidMove(state: GameState, index: number): boolean {
  if (state.status !== "playing") return false;
  if (index < 0 || index >= BOARD_LEN) return false;
  return state.board[index] === null;
}

export function legalMoves(state: GameState): number[] {
  if (state.status !== "playing") return [];
  const moves: number[] = [];
  for (let i = 0; i < BOARD_LEN; i++) {
    if (state.board[i] === null) moves.push(i);
  }
  return moves;
}

export function applyMove(state: GameState, index: number): GameState {
  if (!isValidMove(state, index)) {
    throw new Error(`Illegal move at index ${index}`);
  }
  const board = [...state.board] as Cell[];
  board[index] = state.currentPlayer;
  const t = checkTerminal(board);
  if (t.status === "playing") {
    return {
      board,
      currentPlayer: otherPlayer(state.currentPlayer),
      status: "playing",
      winner: null,
      winningLine: null,
    };
  }
  return {
    board,
    currentPlayer: state.currentPlayer,
    status: t.status,
    winner: t.winner,
    winningLine: t.winningLine,
  };
}

export function boardToKey(board: Cell[]): string {
  let s = "";
  for (const c of board) {
    s += c === null ? "." : c;
  }
  return s;
}
