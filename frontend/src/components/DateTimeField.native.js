import React, { useState } from "react";
import { View, Text, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../design/Theme";
import { Button } from "./MarketUI";
export default function DateTimeField({
  label,
  value,
  onChange,
  timeZone,
  disabled,
}) {
  const { colors: c, dark } = useTheme();
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState(new Date());
  const date = Number.isFinite(+new Date(value)) ? new Date(value) : new Date();
  function open(next) {
    setDraft(date);
    setMode(next);
  }
  const picker = mode ? (
    <DateTimePicker
      value={draft}
      mode={mode}
      display={
        Platform.OS === "ios"
          ? mode === "date"
            ? "inline"
            : "spinner"
          : "default"
      }
      timeZoneName={timeZone}
      themeVariant={dark ? "dark" : "light"}
      onChange={(event, next) => {
        if (Platform.OS === "android") {
          setMode(null);
          if (event.type === "set" && next) onChange(next.toISOString());
        } else if (next) setDraft(next);
      }}
    />
  ) : null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600", color: c.ink }}>{label}</Text>
      <View style={{ gap: 8 }}>
        <Button
          title={date.toLocaleDateString(undefined, {
            timeZone,
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          secondary
          icon="calendar-outline"
          disabled={disabled}
          onPress={() => open("date")}
        />
        <Button
          title={date.toLocaleTimeString(undefined, {
            timeZone,
            hour: "numeric",
            minute: "2-digit",
          })}
          secondary
          icon="time-outline"
          disabled={disabled}
          onPress={() => open("time")}
        />
      </View>
      {Platform.OS === "ios" ? (
        <Modal
          visible={!!mode}
          transparent
          animationType="fade"
          onRequestClose={() => setMode(null)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,.35)",
              padding: 22,
            }}
          >
            <View
              accessibilityViewIsModal
              style={{
                backgroundColor: c.surface,
                borderRadius: 24,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>
                {label} · {mode === "date" ? "Date" : "Time"}
              </Text>
              {picker}
              <Button
                title="Use selection"
                onPress={() => {
                  onChange(draft.toISOString());
                  setMode(null);
                }}
              />
              <Button title="Cancel" secondary onPress={() => setMode(null)} />
            </View>
          </View>
        </Modal>
      ) : (
        picker
      )}
    </View>
  );
}
