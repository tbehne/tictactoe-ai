import type { GameState } from "../game/types";

type Props = {
  game: GameState;
  onCellClick: (index: number) => void;
  disabled?: boolean;
};

export function Board({ game, onCellClick, disabled }: Props) {
  const winSet = new Set(game.winningLine ?? []);

  return (
    <div className="board-wrap">
      <div className="board" role="grid" aria-label="Tic-tac-toe board">
        {game.board.map((cell, i) => {
          const isWin = winSet.has(i);
          const mark = cell === null ? "" : cell;
          const cls = [
            "cell",
            cell === "X" ? "cell-x" : "",
            cell === "O" ? "cell-o" : "",
            isWin ? "cell-win" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const canClick =
            !disabled && game.status === "playing" && cell === null;
          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={!canClick}
              onClick={() => onCellClick(i)}
              aria-label={
                cell === null ? `Empty square ${i + 1}` : `Square ${i + 1}: ${cell}`
              }
            >
              {mark}
            </button>
          );
        })}
      </div>
    </div>
  );
}
