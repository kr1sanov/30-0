"use client";
import { useCallback, useSyncExternalStore } from "react";
import { translateInterface } from "@/lib/enTranslations";
function subscribe(update: () => void) {
  window.addEventListener("30-0-language-change", update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener("30-0-language-change", update);
    window.removeEventListener("storage", update);
  };
}
export function useUiLanguage() {
  return useSyncExternalStore(
    subscribe,
    () => (localStorage.getItem("30-0-language") === "en" ? "en" : "ru"),
    () => "ru",
  );
}
export function useUiTranslation() {
  const language = useUiLanguage();
  return useCallback(
    (text: string) => (language === "en" ? translateInterface(text) : text),
    [language],
  );
}
