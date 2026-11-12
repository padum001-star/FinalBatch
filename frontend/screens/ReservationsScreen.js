import React, { useCallback, useState, useRef } from "react";
import { View, Text, RefreshControl } from "react-native";
import { openConversation } from "../src/state/openConversation";
import { useReservationHistory } from "../src/state/useReservationHistory";
import { useFocusEffect } from "expo-router";
import { useSession } from "../src/state/Session";
import { useTheme } from "../src/design/Theme";
import { api } from "../src/state/api";
import { Page, Button, Notice, price } from "../src/components/MarketUI";
export default function ReservationsScreen() {
  const { user } = useSession();
  return <PickupHistory key={user?.id || "guest"} />;
}
function PickupHistory() {
  const { token, retry } = useSession();
  const { colors: c } = useTheme();
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState("");
  const lock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api("/reservations", { token }));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const { items: history, now } = useReservationHistory(items, load);
  async function cancel(id) {
    if (lock.current) return;
    lock.current = true;
    setBusy(id);
    try {
      await api(`/reservations/${id}/cancel`, { token, method: "POST" });
      await load();
      await retry();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy("");
    }
  }
  return (
    <Page
      title="Your pickups"
      subtitle="Reserved food, ready for a second chance."
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={load}
          tintColor={c.green}
        />
      }
    >
      {error ? (
        <>
          <Notice error>{error}</Notice>
          <Button title="Try again" secondary onPress={load} />
        </>
      ) : null}
      {!loading && !items.length && !error ? (
        <Notice>
          No reservations yet. Find a batch in Explore and reserve it for
          pickup.
        </Notice>
      ) : null}
      {history.some((r) => r.status === "reserved") ? (
        <Text style={{ fontWeight: "700", fontSize: 22, color: c.ink }}>
          Active pickups
        </Text>
      ) : null}
      {history.map((r, index) => (
        <React.Fragment key={r.reservation_id}>
          {r.status !== "reserved" &&
          (index === 0 || history[index - 1].status === "reserved") ? (
            <Text style={{ fontWeight: "700", fontSize: 22, color: c.ink }}>
              Pickup history
            </Text>
          ) : null}
          <View
            key={r.reservation_id}
            style={{
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 20,
              padding: 20,
              gap: 10,
            }}
          >
            <Text style={{ color: c.accent, fontSize: 12, fontWeight: "700" }}>
              {r.status === "reserved"
                ? +new Date(r.pickup_window_end) <= now
                  ? "Pickup grace period"
                  : "Reserved for pickup"
                : r.status === "collected"
                  ? "Collected"
                  : r.status === "expired"
                    ? "Cancelled · pickup missed"
                    : "Cancelled"}
            </Text>
            <Text style={{ color: c.ink, fontSize: 20, fontWeight: "700" }}>
              {r.item_name}
            </Text>
            {r.listing_removed_at ? (
              <Notice error>
                This listing was removed by an administrator. Contact the vendor
                before pickup. You can cancel an uncollected reservation.
              </Notice>
            ) : null}
            <Text style={{ color: c.muted }}>
              {r.business_name} · {r.quantity} × {price(r.unit_price)}
            </Text>
            <Text style={{ color: c.ink, lineHeight: 22 }}>
              {new Date(r.pickup_window_start).toLocaleString()} –{" "}
              {new Date(r.pickup_window_end).toLocaleTimeString()}
              {"\n"}
              {r.address}
            </Text>
            <Text style={{ color: c.muted, fontSize: 12 }}>
              Reference: {r.reservation_id.slice(0, 8)} · No online payment
              taken
            </Text>
            {r.status === "reserved" &&
            +new Date(r.pickup_window_end) <= now ? (
              <Notice>
                You have until{" "}
                {new Date(r.expires_at).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                to collect. After that, this pickup is cancelled automatically.
              </Notice>
            ) : null}
            {r.status === "expired" ? (
              <Notice>
                The pickup window and 10-minute grace period ended without
                collection. No online payment was taken.
              </Notice>
            ) : null}
            <Button
              secondary
              title="Message vendor"
              icon="chatbubble-outline"
              disabled={!!busy}
              onPress={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(r.reservation_id);
                try {
                  await openConversation(token, {
                    reservationId: r.reservation_id,
                  });
                } catch (e) {
                  setError(e.message);
                } finally {
                  lock.current = false;
                  setBusy("");
                }
              }}
            />
            {r.status === "reserved" ? (
              <Button
                title="Cancel reservation"
                secondary
                busy={busy === r.reservation_id}
                disabled={!!busy}
                onPress={() => cancel(r.reservation_id)}
              />
            ) : null}
          </View>
        </React.Fragment>
      ))}
    </Page>
  );
}
