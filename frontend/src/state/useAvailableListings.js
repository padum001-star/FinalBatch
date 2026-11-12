import { useEffect, useState } from "react";
// Local clock boundaries hide expired food without polling the API.
export function useAvailableListings(listings) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const times = listings
      .flatMap((item) => [
        +new Date(item.pickupStart),
        +new Date(item.pickupEnd),
      ])
      .filter((time) => Number.isFinite(time) && time > now);
    if (!times.length) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(2147000000, Math.max(0, Math.min(...times) - Date.now() + 20)),
    );
    return () => clearTimeout(timer);
  }, [listings, now]);
  return {
    now,
    items: listings.filter(
      (item) =>
        item.status === "active" &&
        item.quantity > 0 &&
        +new Date(item.pickupEnd) > now,
    ),
  };
}
