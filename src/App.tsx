import { useMemo, useState } from "react";
import { useTicTacToe } from "./app/useTicTacToe";
import { Board } from "./components/Board";
import { History } from "./components/History";
import { MoveValues } from "./components/MoveValues";
function statusText(ui: ReturnType<typeof useTicTacToe>["ui"]) {
  const { game, mode, humanPlayer } = ui;
  if (game.status === "playing") {
    if (mode === 1) {
      const turn = game.currentPlayer === humanPlayer ? "Your turn" : "AI thinking";
      return `${turn} (${game.currentPlayer})`;
    }
    if (mode === 0 && ui.selfPlayRunning) {
      return `Self-play (${game.currentPlayer})`;
    }
    return `Turn: ${game.currentPlayer}`;
  }
  if (game.status === "tie") return "Result: Tie";
  return `Result: ${game.winner} wins`;
}

export default function App() {
  const {
    ui,
    model,
    newGame,
    setMode,
    setHumanPlayer,
    setAiTraining,
    setEpsilon,
    setPersistEnabled,
    setLearningRate,
    clearHistoryLog,
    onCellClick,
    runSelfPlay,
    stopSelfPlay,
    resetLearnedModel,
  } = useTicTacToe();

  const [batchCount, setBatchCount] = useState(200);

  const liveScores = useMemo(() => {
    if (ui.game.status !== "playing") return [];
    return model.getMoveValues(ui.game);
  }, [model, ui.game]);

  const boardDisabled =
    ui.mode === 0 || ui.selfPlayRunning || (ui.mode === 1 && ui.game.currentPlayer !== ui.humanPlayer);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tic-Tac-Toe AI</h1>
        <span className="muted">Value table learner · React + TypeScript</span>
      </header>

      <div className="layout">
        <div>
          <div className="panel" style={{ marginBottom: "1rem" }}>
            <h2>Board</h2>
            <div className="status" aria-live="polite">
              <strong
                className={
                  ui.game.status === "playing" && ui.game.currentPlayer === "X"
                    ? "current-x"
                    : ui.game.status === "playing" && ui.game.currentPlayer === "O"
                      ? "current-o"
                      : ""
                }
              >
                {statusText(ui)}
              </strong>
            </div>
            <Board game={ui.game} onCellClick={onCellClick} disabled={boardDisabled} />
            <div className="row" style={{ marginTop: "0.85rem" }}>
              <button type="button" className="btn btn-primary" onClick={newGame}>
                New game
              </button>
            </div>
          </div>

          <div className="panel">
            <h2>Move values</h2>
            <MoveValues scores={liveScores} />
          </div>
        </div>

        <div className="controls">
          <div className="panel">
            <h2>Mode</h2>
            <div className="mode-group row">
              <button
                type="button"
                className={`btn${ui.mode === 0 ? " active" : ""}`}
                onClick={() => setMode(0)}
              >
                0 players
              </button>
              <button
                type="button"
                className={`btn${ui.mode === 1 ? " active" : ""}`}
                onClick={() => setMode(1)}
              >
                1 player
              </button>
              <button
                type="button"
                className={`btn${ui.mode === 2 ? " active" : ""}`}
                onClick={() => setMode(2)}
              >
                2 players
              </button>
            </div>
            {ui.mode === 1 && (
              <div className="row" style={{ marginTop: "0.65rem" }}>
                <span className="muted">You play as:</span>
                <button
                  type="button"
                  className={`btn${ui.humanPlayer === "X" ? " active" : ""}`}
                  onClick={() => setHumanPlayer("X")}
                >
                  X
                </button>
                <button
                  type="button"
                  className={`btn${ui.humanPlayer === "O" ? " active" : ""}`}
                  onClick={() => setHumanPlayer("O")}
                >
                  O
                </button>
              </div>
            )}
            {ui.mode === 0 && (
              <div className="row" style={{ marginTop: "0.75rem", alignItems: "center" }}>
                <label className="inline">
                  Games
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value) || 1)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={ui.selfPlayRunning}
                  onClick={() => runSelfPlay(Math.min(50000, Math.max(1, batchCount)))}
                >
                  Run self-play
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={!ui.selfPlayRunning}
                  onClick={stopSelfPlay}
                >
                  Stop
                </button>
                {ui.selfPlayRunning && (
                  <span className="muted">
                    {ui.selfPlayPlayed}/{ui.selfPlayTotal}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="panel">
            <h2>AI training</h2>
            <label className="inline">
              <input
                type="checkbox"
                checked={ui.aiTraining}
                onChange={(e) => setAiTraining(e.target.checked)}
              />
              Training mode (ε-greedy)
            </label>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <label className="inline">
                ε
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={ui.epsilon}
                  onChange={(e) => setEpsilon(Number(e.target.value))}
                />
              </label>
              <span className="muted">{ui.epsilon.toFixed(2)}</span>
            </div>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <label className="inline">
                Learning rate α
                <input
                  type="range"
                  min={0.01}
                  max={0.6}
                  step={0.01}
                  value={ui.learningRate}
                  onChange={(e) => setLearningRate(Number(e.target.value))}
                />
              </label>
              <span className="muted">{ui.learningRate.toFixed(2)}</span>
            </div>
            <label className="inline" style={{ marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                checked={ui.persistEnabled}
                onChange={(e) => setPersistEnabled(e.target.checked)}
              />
              Save model to browser (localStorage)
            </label>
            <div className="row" style={{ marginTop: "0.65rem" }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Clear all learned Q-values? This cannot be undone (except by retraining).",
                    )
                  ) {
                    resetLearnedModel();
                  }
                }}
              >
                Reset learned model
              </button>
              <span className="muted">
                Forgets everything; also clears saved data if persistence is on.
              </span>
            </div>
          </div>

          <History lines={ui.historyLog} onClear={clearHistoryLog} />
        </div>
      </div>
    </div>
  );
}
