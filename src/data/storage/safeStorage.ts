export interface StringStorage {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

export function createSafeStringStorage(storage: StringStorage): StringStorage {
  return {
    async getItem(name) {
      try {
        const value = await storage.getItem(name);
        if (value === null) return null;
        JSON.parse(value);
        return value;
      } catch {
        await storage.removeItem(name);
        return null;
      }
    },
    setItem: (name, value) => storage.setItem(name, value),
    removeItem: (name) => storage.removeItem(name),
  };
}
