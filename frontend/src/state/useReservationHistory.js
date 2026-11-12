import { useEffect, useState } from "react";
import { sortPickups } from "./pickup-time";
export function useReservationHistory(rows, refresh) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const deadlines = rows
      .filter((r) => r.status === "reserved")
      .flatMap((r) => [
        +new Date(r.pickup_window_end),
        +new Date(r.expires_at || +new Date(r.pickup_window_end) + 600000),
      ])
      .filter((t) => t > now);
    if (!deadlines.length) return;
    const timer = setTimeout(
      () => {
        setNow(Date.now());
        void refresh();
      },
      Math.min(
        2147000000,
        Math.max(0, Math.min(...deadlines) - Date.now() + 30),
      ),
    );
    return () => clearTimeout(timer);
  }, [rows, now, refresh]);
  return { items: sortPickups(rows, now), now };
}
