import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/components/layout/MobileScrollInertia.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

async function mount({ width = 390, reduced = false, pathname = '/', userAgent = '' } = {}) {
  const media = [];
  const events = new Map();
  const instances = [];
  let cleanup, observer, subscriber;
  let hidden = false, locked = false;
  const body = { hasAttribute: () => locked };
  const document = { body, get hidden() { return hidden; }, addEventListener: (key, fn) => events.set(key, fn), removeEventListener: (key) => events.delete(key) };
  const window = { scrollY: 270, matchMedia(query) {
    const item = { matches: query.includes('max-width') ? width <= 1023 : reduced, addEventListener: (_, fn) => { item.listener = fn; }, removeEventListener: () => { item.listener = undefined; } };
    media.push(item);
    return item;
  } };
  class Lenis {
    constructor(options) { this.options = options; this.destroyed = false; this.scrolls = []; instances.push(this); }
    destroy() { this.destroyed = true; }
    scrollTo(...args) { this.scrolls.push(args); }
  }
  const exports = {};
  vm.runInNewContext(source, { exports, window, document, navigator: { userAgent },
    getComputedStyle: () => ({ overflowY: locked ? 'hidden' : 'visible' }),
    MutationObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() { observer = undefined; } },
    require(name) {
      if (name === 'react') return { useEffect: (effect) => { cleanup = effect(); } };
      if (name === 'next/navigation') return { usePathname: () => pathname };
      if (name === '@/store/gameStore') return { useGameStore: { subscribe: (fn) => { subscriber = fn; return () => { subscriber = undefined; }; } } };
      if (name === 'lenis') return { default: Lenis };
      throw new Error(name);
    },
  });
  exports.MobileScrollInertia();
  const flush = async () => { await new Promise(setImmediate); };
  await flush();
  return { instances, media, events, flush,
    cleanup: () => cleanup?.(),
    lock: async (value) => { locked = value; observer?.(); await flush(); },
    hide: async (value) => { hidden = value; events.get('visibilitychange')?.(); await flush(); },
    screen: () => subscriber?.({ screen: 'result' }, { screen: 'draft' }),
  };
}

test('mobile inertia preserves nested scroll, controls and horizontal gestures', async () => {
  const app = await mount();
  const { options } = app.instances[0];
  assert.equal(options.syncTouch, true);
  assert.equal(options.allowNestedScroll, true);
  assert.equal(options.virtualScroll({ deltaX: 20, deltaY: 0, event: {} }), false);
  assert.equal(options.virtualScroll({ deltaX: 0, deltaY: 20, event: { ctrlKey: true } }), false);
  assert.equal(options.virtualScroll({ deltaX: 0, deltaY: 20, event: {} }), true);
  assert.equal(options.prevent({ matches: () => true }), true);
  app.screen();
  assert.equal(app.instances[0].scrolls[0][0], 270);
  assert.equal(app.instances[0].scrolls[0][1].immediate, true);
  app.cleanup();
  assert.equal(app.instances[0].destroyed, true);
  assert.equal(app.events.size, 0);
});

test('modal locks and backgrounding release inertia, then restore exactly one instance', async () => {
  const app = await mount();
  await app.lock(true);
  assert.equal(app.instances[0].destroyed, true);
  await app.lock(false);
  assert.equal(app.instances.length, 2);
  await app.hide(true);
  assert.equal(app.instances[1].destroyed, true);
  await app.hide(false);
  assert.equal(app.instances.length, 3);
  app.cleanup();
});

test('desktop, reduced motion, admin and old iOS retain native scrolling', async () => {
  for (const settings of [{ width: 1280 }, { reduced: true }, { pathname: '/admin/challenges' }, { userAgent: 'iPhone OS 15_8' }]) {
    const app = await mount(settings);
    assert.equal(app.instances.length, 0);
    app.cleanup();
  }
});

test('responsive and motion preference changes destroy and restore the enhancement', async () => {
  const app = await mount();
  app.media[1].matches = true;
  await app.media[1].listener();
  assert.equal(app.instances[0].destroyed, true);
  app.media[1].matches = false;
  await app.media[1].listener();
  assert.equal(app.instances.length, 2);
  app.media[0].matches = false;
  await app.media[0].listener();
  assert.equal(app.instances[1].destroyed, true);
  app.cleanup();
});
