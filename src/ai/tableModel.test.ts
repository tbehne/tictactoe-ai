import { describe, expect, it } from "vitest";
import { applyMove, boardToKey, createInitialState } from "../game/engine";
import { TableQModel } from "./tableModel";
import { playOneEpisode } from "./selfPlay";

describe("TableQModel", () => {
  it("picks a legal greedy move with training off", () => {
    const m = new TableQModel({ learningRate: 0.5 });
    const s0 = createInitialState();
    const res = m.suggestMove(s0, () => 1, { training: false, epsilon: 0 });
    expect(res.index).toBe(0);
  });

  it("updates Q toward terminal outcome", () => {
    const m = new TableQModel({ learningRate: 1 });
    let s = createInitialState();
    const traj = [];
    traj.push({
      boardKey: boardToKey(s.board),
      player: s.currentPlayer,
      action: 0,
    });
    s = applyMove(s, 0);
    m.learnFromGame(traj, 1);
    const v = m.getMoveValues(createInitialState()).find((x) => x.index === 0)?.value;
    expect(v).toBe(1);
  });
});

describe("selfPlay episode", () => {
  it("terminates with a valid outcome", () => {
    const m = new TableQModel();
    const rng = () => 0.42;
    const r = playOneEpisode(m, rng, { training: true, epsilon: 0.3 });
    expect(["win", "tie"]).toContain(r.finalState.status);
    expect(r.trajectory.length).toBeGreaterThan(0);
    expect([-1, 0, 1]).toContain(r.outcomeForX);
  });
});
