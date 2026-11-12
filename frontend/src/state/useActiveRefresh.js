import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
// Poll only an open screen while the app is foregrounded. No background service.
export function useActiveRefresh(load, interval = 15000) {
  useFocusEffect(
    useCallback(() => {
      let live = true,
        running = false;
      async function run() {
        if (
          !live ||
          running ||
          AppState.currentState === "background" ||
          AppState.currentState === "inactive"
        )
          return;
        running = true;
        try {
          await load();
        } finally {
          running = false;
        }
      }
      void run();
      const timer = setInterval(() => void run(), interval);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void run();
      });
      return () => {
        live = false;
        clearInterval(timer);
        subscription.remove();
      };
    }, [load, interval]),
  );
}
