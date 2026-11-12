import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { api } from "./api";
const inFlight = new Map();
async function read(key) {
  return Platform.OS === "web"
    ? localStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}
async function write(key, value) {
  if (Platform.OS === "web") localStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}
async function clear(key) {
  if (Platform.OS === "web") localStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}
// Retain the same operation through a timeout/reload. Server enforces uniqueness.
export function reserve({ userId, token, listingId, quantity }) {
  const key = `finalbatch.reserve.${userId}.${listingId}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const work = (async () => {
    const saved = await read(key);
    const intent = saved
      ? JSON.parse(saved)
      : { listingId, quantity, requestId: Crypto.randomUUID() };
    if (!saved) await write(key, JSON.stringify(intent));
    const existing = (await api("/reservations", { token })).find(
      (r) => r.request_id === intent.requestId,
    );
    const result =
      existing ||
      (await api("/reservations", { token, method: "POST", body: intent }));
    await clear(key);
    return result;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, work);
  return work;
}
