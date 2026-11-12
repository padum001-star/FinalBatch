import React, { useState, useRef } from "react";
import { View, Text } from "react-native";
import { api } from "../state/api";
import { useSession } from "../state/Session";
import { useTheme } from "../design/Theme";
import { Button, Field, Notice } from "./MarketUI";
export default function ReportListing({ listingId }) {
  const { token } = useSession();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState("inappropriate_image"),
    [details, setDetails] = useState(""),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function send() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`/listings/${listingId}/report`, {
        token,
        method: "POST",
        body: { reason, details },
      });
      setSent(true);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: c.line,
        paddingTop: 18,
      }}
    >
      {sent ? (
        <Notice>Report sent. An administrator can review this listing.</Notice>
      ) : (
        <Button
          title={open ? "Cancel report" : "Report listing"}
          secondary
          icon="flag-outline"
          onPress={() => setOpen((v) => !v)}
        />
      )}{" "}
      {open ? (
        <>
          <Text style={{ fontSize: 18, color: c.ink, fontWeight: "700" }}>
            What’s wrong with this listing?
          </Text>
          {[
            ["inappropriate_image", "Inappropriate image"],
            ["unsafe_food", "Food safety concern"],
            ["inaccurate_listing", "Inaccurate listing"],
            ["other", "Something else"],
          ].map(([value, label]) => (
            <Button
              key={value}
              title={label}
              secondary={reason !== value}
              onPress={() => setReason(value)}
            />
          ))}
          <Field
            label="Details (optional)"
            multiline
            maxLength={500}
            value={details}
            onChangeText={setDetails}
          />
          <Button title="Send report" busy={busy} onPress={send} />
        </>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}
    </View>
  );
}
