import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState, Player } from "../game/types";
import { applyMove, boardToKey, createInitialState, isValidMove } from "../game/engine";
import { TableQModel } from "../ai/tableModel";
import type { GameStep, MoveScore } from "../ai/types";
import {
  clearStorage,
  loadFromStorage,
  saveToStorage,
} from "../ai/persistence";
import { runSelfPlayChunked } from "../ai/selfPlay";

export type GameMode = 0 | 1 | 2;

export type UiState = {
  game: GameState;
  trajectory: GameStep[];
  historyLog: string[];
  mode: GameMode;
  humanPlayer: Player;
  aiTraining: boolean;
  epsilon: number;
  persistEnabled: boolean;
  learningRate: number;
  lastScores: MoveScore[];
  selfPlayRunning: boolean;
  selfPlayPlayed: number;
  selfPlayTotal: number;
};

function outcomeForXFromState(game: GameState): -1 | 0 | 1 {
  if (game.status === "tie") return 0;
  if (game.winner === "X") return 1;
  if (game.winner === "O") return -1;
  return 0;
}

function cellLabel(index: number): string {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  return `r${row}c${col}`;
}

export function useTicTacToe() {
  const modelRef = useRef<TableQModel | null>(null);
  if (modelRef.current === null) {
    modelRef.current = new TableQModel();
  }
  const model = modelRef.current;

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selfPlayAbort = useRef({ aborted: false });
  const selfPlayRunningRef = useRef(false);
  const uiRef = useRef<UiState | null>(null);

  const [ui, setUi] = useState<UiState>(() => ({
    game: createInitialState(),
    trajectory: [],
    historyLog: [],
    mode: 2,
    humanPlayer: "X",
    aiTraining: true,
    epsilon: 0.15,
    persistEnabled: true,
    learningRate: 0.2,
    lastScores: [],
    selfPlayRunning: false,
    selfPlayPlayed: 0,
    selfPlayTotal: 0,
  }));

  uiRef.current = ui;

  const flushPersist = useCallback(() => {
    const s = uiRef.current;
    if (!s?.persistEnabled) return;
    saveToStorage({
      version: 1,
      q: model.exportQ(),
      learningRate: model.learningRate,
      epsilon: s.epsilon,
      aiTraining: s.aiTraining,
      persistEnabled: s.persistEnabled,
    });
  }, [model]);

  const schedulePersist = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      flushPersist();
    }, 400);
  }, [flushPersist]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const saved = loadFromStorage();
    if (saved) {
      model.importQ(saved.q);
      model.learningRate = saved.learningRate;
      setUi((s) => ({
        ...s,
        epsilon: saved.epsilon,
        aiTraining: saved.aiTraining,
        persistEnabled: saved.persistEnabled,
        learningRate: saved.learningRate,
      }));
    }
  }, [model]);

  const playIndex = useCallback(
    (index: number, scoresOverride?: MoveScore[]) => {
      setUi((s) => {
        if (!isValidMove(s.game, index)) return s;
        const boardKey = boardToKey(s.game.board);
        const player = s.game.currentPlayer;
        const step: GameStep = { boardKey, player, action: index };
        const next = applyMove(s.game, index);
        const scoresForLog = scoresOverride ?? model.getMoveValues(s.game);
        const logLine = `Move ${s.trajectory.length + 1}: ${player} → ${cellLabel(index)}`;
        const scoreStr = scoresForLog.length
          ? ` [values: ${scoresForLog
              .map((x) => `${cellLabel(x.index)}=${x.value.toFixed(2)}`)
              .join(", ")}]`
          : "";
        const newLog = [...s.historyLog, logLine + scoreStr];
        const traj = [...s.trajectory, step];

        if (next.status === "playing") {
          return {
            ...s,
            game: next,
            trajectory: traj,
            historyLog: newLog,
            lastScores: scoresForLog,
          };
        }

        queueMicrotask(() => {
          model.learnFromGame(traj, outcomeForXFromState(next));
          schedulePersist();
        });

        return {
          ...s,
          game: next,
          trajectory: [],
          historyLog: newLog,
          lastScores: [],
        };
      });
    },
    [model, schedulePersist],
  );

  const newGame = useCallback(() => {
    setUi((s) => ({
      ...s,
      game: createInitialState(),
      trajectory: [],
      lastScores: [],
      historyLog: [...s.historyLog, "--- New game ---"],
    }));
  }, []);

  const setMode = useCallback((mode: GameMode) => {
    setUi((s) => ({
      ...s,
      mode,
      game: createInitialState(),
      trajectory: [],
      lastScores: [],
      historyLog: [...s.historyLog, `--- Mode: ${mode}P ---`],
    }));
  }, []);

  const setHumanPlayer = useCallback((humanPlayer: Player) => {
    setUi((s) => ({
      ...s,
      humanPlayer,
      game: createInitialState(),
      trajectory: [],
      lastScores: [],
    }));
  }, []);

  const setAiTraining = useCallback((aiTraining: boolean) => {
    setUi((s) => ({ ...s, aiTraining }));
    queueMicrotask(() => schedulePersist());
  }, [schedulePersist]);

  const setEpsilon = useCallback((epsilon: number) => {
    setUi((s) => ({ ...s, epsilon }));
    queueMicrotask(() => schedulePersist());
  }, [schedulePersist]);

  const setPersistEnabled = useCallback(
    (persistEnabled: boolean) => {
      setUi((s) => ({ ...s, persistEnabled }));
      if (!persistEnabled) clearStorage();
      else queueMicrotask(() => flushPersist());
    },
    [flushPersist],
  );

  const setLearningRate = useCallback(
    (learningRate: number) => {
      model.learningRate = learningRate;
      setUi((s) => ({ ...s, learningRate }));
      queueMicrotask(() => schedulePersist());
    },
    [model, schedulePersist],
  );

  const clearHistoryLog = useCallback(() => {
    setUi((s) => ({ ...s, historyLog: [] }));
  }, []);

  const rng = useCallback(() => Math.random(), []);

  useEffect(() => {
    if (ui.mode !== 1) return;
    if (ui.game.status !== "playing") return;
    if (ui.game.currentPlayer === ui.humanPlayer) return;

    let alive = true;
    const t = window.setTimeout(() => {
      if (!alive) return;
      const snap = uiRef.current;
      if (!snap) return;
      if (snap.mode !== 1 || snap.game.status !== "playing") return;
      if (snap.game.currentPlayer === snap.humanPlayer) return;
      const opts = {
        training: snap.aiTraining,
        epsilon: snap.epsilon,
      };
      const res = model.suggestMove(snap.game, rng, opts);
      playIndex(res.index, res.scores);
    }, 0);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [ui.game, ui.mode, ui.humanPlayer, ui.aiTraining, ui.epsilon, model, rng, playIndex]);

  const runSelfPlay = useCallback(
    (totalGames: number) => {
      const snap = uiRef.current;
      if (!snap || totalGames <= 0 || selfPlayRunningRef.current) return;
      selfPlayRunningRef.current = true;
      selfPlayAbort.current = { aborted: false };
      const moveOptions = {
        training: snap.aiTraining,
        epsilon: snap.epsilon,
      };

      setUi((s) => ({
        ...s,
        selfPlayRunning: true,
        selfPlayPlayed: 0,
        selfPlayTotal: totalGames,
        historyLog: [...s.historyLog, `--- Self-play ×${totalGames} ---`],
      }));

      void runSelfPlayChunked({
        totalGames,
        chunkSize: 25,
        ai: model,
        rng,
        moveOptions,
        signal: selfPlayAbort.current,
        onChunk: ({ gamesPlayed, lastResult }) => {
          setUi((s) => ({
            ...s,
            selfPlayPlayed: gamesPlayed,
            game: lastResult?.finalState ?? s.game,
            lastScores:
              lastResult && lastResult.finalState.status === "playing"
                ? model.getMoveValues(lastResult.finalState)
                : [],
          }));
        },
      }).then(({ gamesPlayed, aborted }) => {
        selfPlayRunningRef.current = false;
        setUi((s) => ({
          ...s,
          selfPlayRunning: false,
          selfPlayPlayed: gamesPlayed,
          historyLog: [
            ...s.historyLog,
            aborted
              ? `Self-play stopped at ${gamesPlayed} games`
              : `Self-play finished: ${gamesPlayed} games`,
          ],
        }));
        schedulePersist();
      });
    },
    [model, rng, schedulePersist],
  );

  const stopSelfPlay = useCallback(() => {
    selfPlayAbort.current.aborted = true;
  }, []);

  /** Clears all Q-values in memory and on disk (when persistence is on). Stops self-play. */
  const resetLearnedModel = useCallback(() => {
    selfPlayAbort.current.aborted = true;
    selfPlayRunningRef.current = false;
    model.importQ({});
    const snap = uiRef.current;
    if (snap?.persistEnabled) {
      flushPersist();
    } else {
      clearStorage();
    }
    setUi((s) => ({
      ...s,
      selfPlayRunning: false,
      lastScores:
        s.game.status === "playing"
          ? model.getMoveValues(s.game)
          : [],
      historyLog: [
        ...s.historyLog,
        "--- Learned model reset (Q-table cleared) ---",
      ],
    }));
  }, [model, flushPersist]);

  const onCellClick = useCallback(
    (index: number) => {
      if (ui.game.status !== "playing") return;
      if (ui.mode === 0 || ui.selfPlayRunning) return;
      if (ui.mode === 1 && ui.game.currentPlayer !== ui.humanPlayer) return;
      playIndex(index);
    },
    [ui, playIndex],
  );

  return {
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
  };
}
