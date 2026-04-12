import type { MoveScore } from "../ai/types";

type Props = {
  scores: MoveScore[];
};

export function MoveValues({ scores }: Props) {
  if (scores.length === 0) {
    return <p className="muted">No scores (game over or no legal moves).</p>;
  }
  return (
    <div className="scores" aria-label="Estimated value per move for player to move">
      {scores.map((s) => {
        const t = (s.value + 1) / 2;
        const widthPct = Math.round(Math.min(100, Math.max(0, t * 100)));
        return (
          <div key={s.index} className="score-row">
            <span className="idx">sq {s.index + 1}</span>
            <div className="score-bar" title={`Raw: ${s.value.toFixed(3)}`}>
              <i style={{ width: `${widthPct}%` }} />
            </div>
            <span>{s.value.toFixed(2)}</span>
          </div>
        );
      })}
      <span className="muted">
        Bar maps value in [-1, 1] to width (loss → tie → win).
      </span>
    </div>
  );
}
