import { writable } from 'svelte/store';

export const token = writablePersistent("token");
export const userId = writablePersistent("userId");
export const loggedInUsername = writablePersistent("loggedInUsername");

function writablePersistent(name) {
  const token = writable(localStorage.getItem(name) || null);
  token.subscribe(val => localStorage.setItem(name, val || ""));
  return token
}