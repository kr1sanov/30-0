"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { translateInterface } from "@/lib/enTranslations";

type Language = "ru" | "en";
const originals = new WeakMap<Text, { source: string; rendered: string }>();
const originalAttributes = new WeakMap<
  Element,
  Map<string, { source: string; rendered: string }>
>();
const attributeNames = ["aria-label", "placeholder", "title", "alt"];
let originalTitle = "";
let originalDescription = "";
let renderedTitle = "";
let renderedDescription = "";

function translatePage(language: Language, root: Node = document.body) {
  if (!root) return;
  if (!originalTitle || document.title !== renderedTitle)
    originalTitle = document.title;
  renderedTitle =
    language === "en" ? translateInterface(originalTitle) : originalTitle;
  document.title = renderedTitle;
  const description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  if (description) {
    if (!originalDescription || description.content !== renderedDescription)
      originalDescription = description.content;
    renderedDescription =
      language === "en"
        ? translateInterface(originalDescription)
        : originalDescription;
    description.content = renderedDescription;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null =
    root.nodeType === Node.TEXT_NODE ? root : walker.nextNode();
  for (; current; current = walker.nextNode()) {
    const node = current as Text;
    if (
      node.parentElement?.closest("script, style, noscript, textarea") ||
      node.parentElement
        ?.closest("[data-no-translate], [data-translate]")
        ?.hasAttribute("data-no-translate")
    )
      continue;
    const rendered = node.nodeValue ?? "";
    const previous = originals.get(node);
    const source =
      previous && previous.rendered === rendered ? previous.source : rendered;
    const translated = language === "en" ? translateInterface(source) : source;
    originals.set(node, { source, rendered: translated });
    if (rendered !== translated) node.nodeValue = translated;
  }
  const elements =
    root instanceof Element
      ? [
          root,
          ...root.querySelectorAll(
            "[aria-label], [placeholder], [title], [alt]",
          ),
        ]
      : [];
  for (const element of elements) {
    if (
      element.closest("script, style, noscript") ||
      element
        .closest("[data-no-translate], [data-translate]")
        ?.hasAttribute("data-no-translate")
    )
      continue;
    const records = originalAttributes.get(element) ?? new Map();
    for (const name of attributeNames) {
      const rendered = element.getAttribute(name);
      if (rendered === null) continue;
      const previous = records.get(name);
      const source =
        previous && previous.rendered === rendered ? previous.source : rendered;
      const translated =
        language === "en" ? translateInterface(source) : source;
      records.set(name, { source, rendered: translated });
      if (rendered !== translated) element.setAttribute(name, translated);
    }
    originalAttributes.set(element, records);
  }
}

const LANGUAGE_EVENT = "30-0-language-change";

export function LanguageController() {
  const pathname = usePathname();
  const admin = pathname?.startsWith("/admin");
  useEffect(() => {
    const saved = localStorage.getItem(
      admin ? "30-0-admin-language" : "30-0-language",
    );
    const selected: Language = saved === "en" ? "en" : "ru";
    document.documentElement.lang = selected;
    document.documentElement.dataset.language = selected;
    translatePage(selected);
    let frame = 0;
    const pending = new Set<Node>();
    const observe = () =>
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: attributeNames,
      });
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList")
          record.addedNodes.forEach((node) => pending.add(node));
        else pending.add(record.target);
      }
      if (frame || !pending.size) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        observer.disconnect();
        const language = document.documentElement.lang === "en" ? "en" : "ru";
        for (const node of pending)
          if (node.isConnected) translatePage(language, node);
        pending.clear();
        observe();
      });
    });
    observe();
    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      document.documentElement.lang = next;
      document.documentElement.dataset.language = next;
      observer.disconnect();
      translatePage(next);
      observe();
    };
    const eventName = admin ? "30-0-admin-language-change" : LANGUAGE_EVENT;
    window.addEventListener(eventName, onLanguageChange);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener(eventName, onLanguageChange);
    };
  }, [admin]);
  return null;
}

export default function LanguageSwitcher({
  admin = false,
}: {
  admin?: boolean;
}) {
  const [language, setLanguage] = useState<Language>("ru");
  useEffect(() => {
    setLanguage(
      localStorage.getItem(admin ? "30-0-admin-language" : "30-0-language") ===
        "en"
        ? "en"
        : "ru",
    );
  }, [admin]);
  function choose(next: Language) {
    localStorage.setItem(admin ? "30-0-admin-language" : "30-0-language", next);
    setLanguage(next);
    window.dispatchEvent(
      new CustomEvent(admin ? "30-0-admin-language-change" : LANGUAGE_EVENT, {
        detail: next,
      }),
    );
  }
  return (
    <div
      data-no-translate
      className="language-switcher"
      role="group"
      aria-label="Language / Язык"
    >
      <button
        type="button"
        onClick={() => choose("ru")}
        aria-pressed={language === "ru"}
      >
        🇷🇺 RU
      </button>
      <button
        type="button"
        onClick={() => choose("en")}
        aria-pressed={language === "en"}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
