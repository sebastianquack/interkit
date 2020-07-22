import { writable } from 'svelte/store';

export const token = writablePersistent("token");
export const userId = writablePersistent("userId");
export const loggedInUsername = writablePersistent("loggedInUsername");

function writablePersistent(name) {
  const store = writable(localStorage.getItem(name) || null);
  store.subscribe(val => localStorage.setItem(name, val || ""));
  return store
}

export const boardCodeChanged = writable(false);