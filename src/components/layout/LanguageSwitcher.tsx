'use client';
import { useEffect, useState } from 'react';
import { translateInterface } from '@/lib/enTranslations';

type Language = 'ru' | 'en';
const originals = new WeakMap<Text, { source: string; rendered: string }>();
const originalAttributes = new WeakMap<Element, Map<string, { source: string; rendered: string }>>();
const attributeNames = ['aria-label', 'placeholder', 'title', 'alt'];
let originalTitle = '';
let originalDescription = '';
let renderedTitle = '';
let renderedDescription = '';

function translatePage(language: Language) {
  const root = document.body;
  if (!root) return;
  if (!originalTitle || document.title !== renderedTitle) originalTitle = document.title;
  renderedTitle = language === 'en' ? translateInterface(originalTitle) : originalTitle;
  document.title = renderedTitle;
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) {
    if (!originalDescription || description.content !== renderedDescription) originalDescription = description.content;
    renderedDescription = language === 'en' ? translateInterface(originalDescription) : originalDescription;
    description.content = renderedDescription;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    if (node.parentElement?.closest('script, style, noscript, textarea, [data-no-translate]')) continue;
    const rendered = node.nodeValue ?? '';
    const previous = originals.get(node);
    const source = previous && previous.rendered === rendered ? previous.source : rendered;
    const translated = language === 'en' ? translateInterface(source) : source;
    originals.set(node, { source, rendered: translated });
    if (rendered !== translated) node.nodeValue = translated;
  }
  for (const element of root.querySelectorAll('*')) {
    if (element.closest('script, style, noscript, [data-no-translate]')) continue;
    const records = originalAttributes.get(element) ?? new Map();
    for (const name of attributeNames) {
      const rendered = element.getAttribute(name);
      if (rendered === null) continue;
      const previous = records.get(name);
      const source = previous && previous.rendered === rendered ? previous.source : rendered;
      const translated = language === 'en' ? translateInterface(source) : source;
      records.set(name, { source, rendered: translated });
      if (rendered !== translated) element.setAttribute(name, translated);
    }
    originalAttributes.set(element, records);
  }
}

const LANGUAGE_EVENT = '30-0-language-change';

export function LanguageController() {
  useEffect(() => {
    const saved = localStorage.getItem('30-0-language');
    const selected: Language = saved === 'en' ? 'en' : 'ru';
    document.documentElement.lang = selected;
    document.documentElement.dataset.language = selected;
    translatePage(selected);
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        translatePage(document.documentElement.lang === 'en' ? 'en' : 'ru');
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attributeNames });
    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      document.documentElement.lang = next;
      document.documentElement.dataset.language = next;
      translatePage(next);
    };
    window.addEventListener(LANGUAGE_EVENT, onLanguageChange);
    return () => {
      observer.disconnect();
      window.removeEventListener(LANGUAGE_EVENT, onLanguageChange);
    };
  }, []);
  return null;
}

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState<Language>('ru');
  useEffect(() => {
    setLanguage(localStorage.getItem('30-0-language') === 'en' ? 'en' : 'ru');
  }, []);
  function choose(next: Language) {
    localStorage.setItem('30-0-language', next);
    setLanguage(next);
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: next }));
  }
  return <div data-no-translate className="language-switcher" role="group" aria-label="Language / Язык">
    <button type="button" onClick={() => choose('ru')} aria-pressed={language === 'ru'}>🇷🇺 RU</button>
    <button type="button" onClick={() => choose('en')} aria-pressed={language === 'en'}>🇬🇧 EN</button>
  </div>;
}
