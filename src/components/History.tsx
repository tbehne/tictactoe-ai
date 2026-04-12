type Props = {
  lines: string[];
  onClear: () => void;
};

export function History({ lines, onClear }: Props) {
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ marginBottom: 0 }}>Game log</h2>
        <button type="button" className="btn" onClick={onClear}>
          Clear log
        </button>
      </div>
      <div className="history" role="log" aria-live="polite">
        {lines.length === 0 ? (
          <div className="muted">No moves yet.</div>
        ) : (
          lines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}
