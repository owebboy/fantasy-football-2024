import { writable, type Writable } from "svelte/store";
import type { Player } from "../players";

interface PersistedStores {
  keepers: Writable<Player[]>;
  draft: Writable<Player[]>;
  currentTab: Writable<string>;
  ready: Promise<void>;
}

function createPersistedStores(): PersistedStores {
  const createStore = <T>(
    key: string,
    initialValue: T,
  ): { store: Writable<T>; ready: Promise<void> } => {
    let initial = initialValue;
    const store = writable<T>(initial);

    const ready = new Promise<void>((resolve) => {
      if (typeof window !== "undefined") {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          store.set(JSON.parse(storedValue) as T);
        }
        resolve();
      } else {
        resolve();
      }
    });

    if (typeof window !== "undefined") {
      store.subscribe((value) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
    }

    return { store, ready };
  };

  const { store: keepers, ready: keepersReady } = createStore<Player[]>(
    "keepers",
    [],
  );
  const { store: draft, ready: draftReady } = createStore<Player[]>(
    "draft",
    [],
  );
  const { store: currentTab, ready: currentTabReady } = createStore<string>(
    "currentTab",
    "all players",
  );

  const ready = Promise.all([keepersReady, draftReady, currentTabReady]).then(
    () => {},
  );

  return { keepers, draft, currentTab, ready };
}

export const stores = createPersistedStores();
