import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../design/Theme";
import { localValue, toInstant } from "../state/pickup-time";
export default function DateTimeField({
  label,
  value,
  onChange,
  timeZone,
  disabled,
}) {
  const { colors: c } = useTheme();
  const local = localValue(value, timeZone);
  const style = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 50,
    border: `1px solid ${c.line}`,
    borderRadius: 13,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.surface,
    colorScheme: c.bg === "#131B16" ? "dark" : "light",
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600", color: c.ink }}>{label}</Text>
      <input
        type="date"
        aria-label={`${label} date`}
        disabled={disabled}
        value={local.slice(0, 10)}
        style={style}
        onChange={(e) => {
          if (e.target.value) {
            try {
              onChange(
                toInstant(`${e.target.value}T${local.slice(11)}`, timeZone),
              );
              e.target.setCustomValidity("");
            } catch (err) {
              e.target.setCustomValidity(err.message);
              e.target.reportValidity();
            }
          }
        }}
      />
      <input
        type="time"
        aria-label={`${label} time`}
        disabled={disabled}
        value={local.slice(11)}
        style={style}
        onChange={(e) => {
          if (e.target.value) {
            try {
              onChange(
                toInstant(`${local.slice(0, 10)}T${e.target.value}`, timeZone),
              );
              e.target.setCustomValidity("");
            } catch (err) {
              e.target.setCustomValidity(err.message);
              e.target.reportValidity();
            }
          }
        }}
      />
    </View>
  );
}
