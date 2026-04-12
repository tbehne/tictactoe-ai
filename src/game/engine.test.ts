import { describe, expect, it } from "vitest";
import {
  applyMove,
  createInitialState,
  isValidMove,
  legalMoves,
} from "./engine";
import type { Cell } from "./types";
import { checkTerminal } from "./winning";

describe("engine", () => {
  it("starts empty with X to move", () => {
    const s = createInitialState();
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.currentPlayer).toBe("X");
    expect(s.status).toBe("playing");
  });

  it("rejects illegal moves", () => {
    let s = createInitialState();
    expect(isValidMove(s, 0)).toBe(true);
    s = applyMove(s, 0);
    expect(isValidMove(s, 0)).toBe(false);
    expect(() => applyMove(s, 0)).toThrow();
  });

  it("detects horizontal win and freezes board", () => {
    let s = createInitialState();
    s = applyMove(s, 0); // X
    s = applyMove(s, 3); // O
    s = applyMove(s, 1); // X
    s = applyMove(s, 4); // O
    s = applyMove(s, 2); // X wins top row
    expect(s.status).toBe("win");
    expect(s.winner).toBe("X");
    expect(s.winningLine).toEqual([0, 1, 2]);
    expect(legalMoves(s)).toEqual([]);
  });

  it("detects tie on full board without winner", () => {
    const board = createInitialState().board as Cell[];
    board[0] = "O";
    board[1] = "X";
    board[2] = "O";
    board[3] = "X";
    board[4] = "X";
    board[5] = "O";
    board[6] = "X";
    board[7] = "O";
    board[8] = "X";
    expect(checkTerminal(board).status).toBe("tie");
  });
});

describe("winning", () => {
  it("reports playing for partial board", () => {
    const board = createInitialState().board;
    board[0] = "X";
    expect(checkTerminal(board).status).toBe("playing");
  });
});
