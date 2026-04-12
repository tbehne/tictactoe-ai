const STORAGE_KEY = "tictactoe-ai-model-v1";

export type PersistedModel = {
  version: 1;
  q: Record<string, number>;
  learningRate: number;
  epsilon: number;
  aiTraining: boolean;
  persistEnabled: boolean;
};

export function defaultPersisted(): Omit<PersistedModel, "q"> & { q: Record<string, number> } {
  return {
    version: 1,
    q: {},
    learningRate: 0.2,
    epsilon: 0.15,
    aiTraining: true,
    persistEnabled: true,
  };
}

export function loadFromStorage(): PersistedModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedModel;
    if (data.version !== 1 || typeof data.q !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export function saveToStorage(data: PersistedModel): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
