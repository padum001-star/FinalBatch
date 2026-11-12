import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useSession } from "../../state/Session";
import { api } from "../../state/api";
import { useActiveRefresh } from "../../state/useActiveRefresh";
import { useTheme } from "../../design/Theme";
import { Page, Button, Notice } from "../../components/MarketUI";
function mergeMessages(a, b) {
  return [...new Map([...a, ...b].map((m) => [m.message_id, m])).values()].sort(
    (x, y) =>
      +new Date(x.created_at) - +new Date(y.created_at) ||
      x.message_id.localeCompare(y.message_id),
  );
}
export default function Conversation() {
  const { id } = useLocalSearchParams();
  const { user } = useSession();
  return <Thread key={`${user?.id || "guest"}:${id}`} id={id} />;
}
function Thread({ id }) {
  const { token, user, ready } = useSession(),
    { colors: c } = useTheme();
  const [conversation, setConversation] = useState(null),
    [messages, setMessages] = useState([]),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [older, setOlder] = useState(false),
    [cursor, setCursor] = useState(null),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef(null),
    lock = useRef(false),
    initialized = useRef(false);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api(
        `/conversations/${encodeURIComponent(id)}/messages`,
        { token },
      );
      setConversation(data.conversation);
      setMessages((previous) => mergeMessages(previous, data.messages));
      if (!initialized.current) {
        setCursor(data.nextCursor);
        initialized.current = true;
      }
      const sent =
        pending.current &&
        data.messages.find(
          (m) =>
            m.client_message_id === pending.current.id &&
            m.sender_id === user?.id,
        );
      if (sent) {
        setDraft((v) => (v.trim() === sent.body ? "" : v));
        pending.current = null;
        setUncertain(false);
      }
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, token, user?.id]);
  useActiveRefresh(load, 10000);
  async function loadOlder() {
    if (!cursor || older) return;
    setOlder(true);
    try {
      const data = await api(
        `/conversations/${id}/messages?before=${encodeURIComponent(cursor)}`,
        { token },
      );
      setMessages((previous) => mergeMessages(previous, data.messages));
      setCursor(data.nextCursor);
    } catch (e) {
      setError(e.message);
    } finally {
      setOlder(false);
    }
  }
  async function send() {
    const body = draft.trim();
    if (!body || lock.current) return;
    lock.current = true;
    setSending(true);
    setError("");
    const request =
      pending.current?.body === body
        ? pending.current
        : { id: Crypto.randomUUID(), body };
    pending.current = request;
    try {
      const message = await api(`/conversations/${id}/messages`, {
        token,
        method: "POST",
        body: { clientMessageId: request.id, body },
      });
      setMessages((previous) => mergeMessages(previous, [message]));
      setDraft("");
      pending.current = null;
      setUncertain(false);
    } catch (e) {
      setError(e.message + " Retry send to check the same message.");
      setUncertain(true);
    } finally {
      lock.current = false;
      setSending(false);
    }
  }
  if (!ready) return <ActivityIndicator color={c.green} />;
  if (!user) return <Redirect href="/auth" />;
  const title = conversation
    ? conversation.customer_id === user.id
      ? conversation.business_name
      : conversation.customer_name
    : "Conversation";
  return (
    <Page title={title} subtitle={conversation?.item_name} back scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {error ? (
          <View style={{ paddingHorizontal: 22, paddingVertical: 8, gap: 8 }}>
            <Notice error>{error}</Notice>
            <Button title="Refresh conversation" secondary onPress={load} />
          </View>
        ) : null}
        {loading ? <ActivityIndicator color={c.green} /> : null}
        <FlatList
          style={{ flex: 1 }}
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => m.message_id}
          contentContainerStyle={{ padding: 22, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            cursor ? (
              <Button
                title={older ? "Loading…" : "Load earlier messages"}
                secondary
                busy={older}
                onPress={loadOlder}
              />
            ) : null
          }
          ListEmptyComponent={
            !loading && !error ? (
              <View style={{ transform: [{ scaleY: -1 }] }}>
                <Notice>
                  Ask about ingredients, availability, or where to collect your
                  food.
                </Notice>
              </View>
            ) : null
          }
          renderItem={({ item: m }) => {
            const mine = m.sender_id === user.id;
            return (
              <View
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: 14,
                  gap: 7,
                  borderRadius: 18,
                  backgroundColor: mine ? c.green : c.tint,
                }}
              >
                <Text
                  selectable
                  style={{
                    color: mine ? c.onGreen : c.ink,
                    fontSize: 16,
                    lineHeight: 23,
                  }}
                >
                  {m.body}
                </Text>
                <Text
                  style={{
                    color: mine ? c.onGreen : c.muted,
                    fontSize: 11,
                    opacity: 0.8,
                  }}
                >
                  {new Date(m.created_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            );
          }}
        />
        <View
          style={{
            padding: 16,
            paddingBottom: 24,
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: c.line,
            backgroundColor: c.surface,
          }}
        >
          <TextInput
            accessibilityLabel="Message"
            placeholder="Write a message…"
            placeholderTextColor={c.muted}
            value={draft}
            onChangeText={setDraft}
            editable={!sending}
            multiline
            maxLength={2000}
            style={{
              minHeight: 48,
              maxHeight: 130,
              padding: 12,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 15,
              color: c.ink,
              fontSize: 16,
            }}
          />
          <Button
            title={uncertain ? "Retry send" : "Send message"}
            icon="send-outline"
            busy={sending}
            disabled={!draft.trim() || !conversation}
            onPress={send}
          />
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}
