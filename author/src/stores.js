import { writable } from 'svelte/store';

export const token = writable(null);
export const userId = writable(null);
export const loggedInUsername = writable(null);