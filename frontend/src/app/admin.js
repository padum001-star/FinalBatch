import React, { useCallback, useState } from "react";
import { View, Text, Image, RefreshControl } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { useSession } from "../state/Session";
import { useTheme } from "../design/Theme";
import { api } from "../state/api";
import { Page, Button, Field, Notice, pickup } from "../components/MarketUI";
function ReviewCard({ item, onAction, busy }) {
  const { colors: c } = useTheme();
  const [showPhoto, setShowPhoto] = useState(false),
    [note, setNote] = useState(""),
    [confirm, setConfirm] = useState(false);
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 20,
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>
          {item.itemName}
        </Text>
        <Text style={{ color: c.muted }}>
          {item.vendorName} · {item.status.replace("_", " ")}
        </Text>
        <Text style={{ color: c.muted, fontSize: 12 }}>{pickup(item)}</Text>
      </View>
      {item.reportCount > 0 ? (
        <Notice error>{item.reportCount} open report(s)</Notice>
      ) : null}
      {item.photoUrl ? (
        <>
          <Button
            title={showPhoto ? "Hide photo" : "View listing photo"}
            secondary
            onPress={() => setShowPhoto((v) => !v)}
          />
          {showPhoto ? (
            <Image
              source={{ uri: item.photoUrl }}
              accessibilityLabel={item.itemName}
              style={{ width: "100%", aspectRatio: 1.4, borderRadius: 14 }}
            />
          ) : null}
        </>
      ) : null}
      {item.reports.map((r, index) => (
        <Text key={index} style={{ color: c.ink, lineHeight: 21 }}>
          {r.reason.replaceAll("_", " ")}
          {r.details ? `: ${r.details}` : ""}
        </Text>
      ))}
      {item.removedAt ? <Notice>Removed: {item.removalReason}</Notice> : null}
      {!item.removedAt || item.photoCleanupPending ? (
        <>
          <Field
            label={`Reason for ${item.itemName}`}
            value={note}
            maxLength={500}
            onChangeText={setNote}
            placeholder="Explain the moderation decision"
          />
          {confirm ? (
            <>
              <Notice>
                Hide this listing and block its photo? Existing reservation
                records are kept.
              </Notice>
              <Button
                title="Confirm removal"
                busy={busy}
                disabled={note.trim().length < 3}
                onPress={() => onAction(item.id, "remove", note)}
              />
              <Button
                title="Keep listing"
                secondary
                disabled={busy}
                onPress={() => setConfirm(false)}
              />
            </>
          ) : (
            <Button
              title={
                item.photoCleanupPending
                  ? "Retry photo cleanup"
                  : "Remove listing"
              }
              secondary
              disabled={busy || note.trim().length < 3}
              onPress={() => setConfirm(true)}
            />
          )}{" "}
          {!item.removedAt && item.reportCount > 0 ? (
            <Button
              title="Dismiss reports"
              secondary
              disabled={busy || note.trim().length < 3}
              onPress={() => onAction(item.id, "dismiss-reports", note)}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}
export default function Admin() {
  const { user, token, ready, retry } = useSession();
  const { colors: c } = useTheme();
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [reported, setReported] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api("/admin/listings", { token }));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      if (ready && user?.role === "admin") void load();
    }, [ready, user?.role, load]),
  );
  async function action(id, kind, reason) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(`/admin/listings/${id}/${kind}`, {
        token,
        method: "POST",
        body: { reason },
      });
      setMessage(
        kind === "remove"
          ? result.photoBlocked
            ? "Listing hidden and photo blocked."
            : "Listing hidden. Photo cleanup needs another attempt."
          : "Reports dismissed.",
      );
      await load();
      await retry();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <Page title="Moderation">
        <Notice>Restoring your account…</Notice>
      </Page>
    );
  if (!user) return <Redirect href="/auth" />;
  if (user.role !== "admin") return <Redirect href="/" />;
  const visible = items.filter(
    (i) => !reported || i.reportCount > 0 || i.photoCleanupPending,
  );
  return (
    <Page
      title="Listing moderation"
      subtitle="Review reports and manage published food listings."
      back
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={load}
          tintColor={c.green}
        />
      }
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          title="Needs review"
          secondary={!reported}
          onPress={() => setReported(true)}
          style={{ flex: 1 }}
        />
        <Button
          title="All listings"
          secondary={reported}
          onPress={() => setReported(false)}
          style={{ flex: 1 }}
        />
      </View>
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {!loading && !visible.length ? (
        <Notice>
          {reported ? "No reports need review." : "No published listings yet."}
        </Notice>
      ) : null}
      {visible.map((item) => (
        <ReviewCard key={item.id} item={item} busy={busy} onAction={action} />
      ))}
    </Page>
  );
}
