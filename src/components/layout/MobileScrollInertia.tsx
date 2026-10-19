"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { useGameStore } from "@/store/gameStore";

/** Enhance the document only; nested lists and modal scroll locks stay native. */
export function MobileScrollInertia() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const mobile = window.matchMedia("(max-width: 1023px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Older iOS WebViews cannot reliably synchronize touch-driven scrolling.
    const iosVersion = /(?:iPhone|iPad|iPod).*OS (\d+)_/.exec(navigator.userAgent);
    if (iosVersion && Number(iosVersion[1]) < 16) return;

    let instance: Lenis | undefined;
    let disposed = false;
    let generation = 0;

    const reset = () => {
      instance?.scrollTo(window.scrollY, { immediate: true, force: true });
    };
    const update = async () => {
      const current = ++generation;
      const locked = document.body.hasAttribute("data-scroll-locked") ||
        ["hidden", "clip"].includes(getComputedStyle(document.body).overflowY);
      const enabled = mobile.matches && !reducedMotion.matches && !document.hidden && !locked;
      if (!enabled) {
        instance?.destroy();
        instance = undefined;
        return;
      }
      if (instance) return;
      try {
        const { default: Lenis } = await import("lenis");
        if (disposed || current !== generation) return;
        instance = new Lenis({
          autoRaf: true,
          syncTouch: true,
          syncTouchLerp: 0.09,
          touchInertiaExponent: 1.5,
          lerp: 0.12,
          allowNestedScroll: true,
          stopInertiaOnNavigate: true,
          prevent: (node) => node.matches(
            'input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"], .draft-player-panel',
          ),
          // Leave horizontal gestures (sliders, carousels) to their own controls.
          virtualScroll: ({ deltaX, deltaY, event }) =>
            !event.ctrlKey && Math.abs(deltaY) >= Math.abs(deltaX),
        });
      } catch {
        // A failed optional chunk must leave native page scrolling available.
      }
    };

    const observer = new MutationObserver(() => { void update(); });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class", "data-scroll-locked"],
    });
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.screen !== previous.screen) reset();
    });
    mobile.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    void update();

    return () => {
      disposed = true;
      generation++;
      observer.disconnect();
      unsubscribe();
      mobile.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      instance?.destroy();
    };
  }, [pathname]);

  return null;
}
