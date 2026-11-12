import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
const palettes = {
  light: {
    bg: "#F5F7F0",
    surface: "#FFFFFF",
    ink: "#1C2620",
    muted: "#5C6B62",
    line: "#E1E7DC",
    green: "#1F4D3D",
    accent: "#C54826",
    tint: "#E8EEE4",
    onGreen: "#FFFFFF",
    danger: "#B53D32",
  },
  dark: {
    bg: "#131B16",
    surface: "#1C2820",
    ink: "#F3F6EE",
    muted: "#BAC6BC",
    line: "#354539",
    green: "#B6D7AB",
    accent: "#FFAD8E",
    tint: "#2C3E31",
    onGreen: "#15251C",
    danger: "#FFAB9E",
  },
};
const Context = createContext(null);
export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState("light");
  useEffect(() => {
    let live = true;
    const read =
      Platform.OS === "web"
        ? Promise.resolve(
            typeof localStorage === "undefined"
              ? null
              : localStorage.getItem("finalbatch.theme"),
          )
        : SecureStore.getItemAsync("finalbatch.theme");
    read
      .then((v) => {
        if (live && ["light", "dark", "system"].includes(v)) setMode(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const change = async (value) => {
    setMode(value);
    try {
      if (Platform.OS === "web")
        localStorage.setItem("finalbatch.theme", value);
      else await SecureStore.setItemAsync("finalbatch.theme", value);
    } catch {}
  };
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  return (
    <Context.Provider
      value={{
        colors: palettes[dark ? "dark" : "light"],
        dark,
        mode,
        setMode: change,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useTheme = () => useContext(Context);
