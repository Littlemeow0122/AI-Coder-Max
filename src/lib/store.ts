import { useEffect, useState } from "react";
import type { Conversation } from "./types";
import { uid } from "./format";

const KEY = "coder-ai:v1";

type Store = {
  conversations: Conversation[];
  activeId: string | null;
};

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const id = uid();
  return {
    conversations: [
      { id, title: "新對話", createdAt: Date.now(), updatedAt: Date.now(), messages: [] },
    ],
    activeId: id,
  };
}

let listeners = new Set<() => void>();
let state: Store = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}

export const storeActions = {
  newConversation() {
    const id = uid();
    state = {
      ...state,
      conversations: [
        { id, title: "新對話", createdAt: Date.now(), updatedAt: Date.now(), messages: [] },
        ...state.conversations,
      ],
      activeId: id,
    };
    persist();
    return id;
  },
  selectConversation(id: string) {
    state = { ...state, activeId: id };
    persist();
  },
  deleteConversation(id: string) {
    const remaining = state.conversations.filter((c) => c.id !== id);
    let activeId = state.activeId;
    if (activeId === id) activeId = remaining[0]?.id ?? null;
    if (remaining.length === 0) {
      const nid = uid();
      state = {
        conversations: [
          { id: nid, title: "新對話", createdAt: Date.now(), updatedAt: Date.now(), messages: [] },
        ],
        activeId: nid,
      };
    } else {
      state = { ...state, conversations: remaining, activeId };
    }
    persist();
  },
  renameConversation(id: string, title: string, auto = false) {
    state = {
      ...state,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, titleAuto: auto || c.titleAuto, updatedAt: Date.now() } : c
      ),
    };
    persist();
  },
  updateConversation(id: string, updater: (c: Conversation) => Conversation) {
    state = {
      ...state,
      conversations: state.conversations.map((c) => (c.id === id ? updater(c) : c)),
    };
    persist();
  },
  importConversations(convs: Conversation[]) {
    state = {
      conversations: [...convs, ...state.conversations],
      activeId: convs[0]?.id ?? state.activeId,
    };
    persist();
  },
};
