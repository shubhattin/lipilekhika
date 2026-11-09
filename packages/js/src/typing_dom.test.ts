import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent,
  handleTypingInputEvent
} from './typing';

// A minimal fake DOM: the handlers only use `instanceof`, `value`, the selection and `setRangeText`
class FakeEvent {
  type: string;
  defaultPrevented = false;
  isComposing = false;
  constructor(type: string, init: object = {}) {
    this.type = type;
    Object.assign(this, init);
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}
class FakeInputEvent extends FakeEvent {
  data: string | null = null;
  inputType = '';
  target: unknown = null;
  currentTarget: unknown = null;
  constructor(type: string, init: object = {}) {
    super(type);
    Object.assign(this, init);
  }
}
class FakeKeyboardEvent extends FakeEvent {
  key = '';
  ctrlKey = false;
  metaKey = false;
  altKey = false;
  shiftKey = false;
  constructor(type: string, init: object = {}) {
    super(type);
    Object.assign(this, init);
  }
}
class FakeTextArea {
  value = '';
  selectionStart = 0;
  selectionEnd = 0;
  setRangeText(text: string, start: number, end: number, mode: string) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    if (mode === 'end') this.selectionStart = this.selectionEnd = start + text.length;
  }
  /** Moves the caret, like a mouse click or touch would (no keydown, no input event) */
  setCaret(pos: number) {
    this.selectionStart = this.selectionEnd = pos;
  }
}
class FakeInput extends FakeTextArea {}

beforeAll(() => {
  vi.stubGlobal('InputEvent', FakeInputEvent);
  vi.stubGlobal('KeyboardEvent', FakeKeyboardEvent);
  vi.stubGlobal('HTMLTextAreaElement', FakeTextArea);
  vi.stubGlobal('HTMLInputElement', FakeInput);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

type Ctx = ReturnType<typeof createTypingContext>;
type Script = Parameters<typeof createTypingContext>[0];

const setup = async (initial = '', script: Script = 'Devanagari') => {
  const el = new FakeTextArea();
  el.value = initial;
  el.setCaret(initial.length);
  const ctx = createTypingContext(script);
  await ctx.ready;
  return { el, ctx };
};

/** Like a browser: fires `beforeinput`, and inserts the data itself unless it was prevented */
const beforeInput = async (
  el: FakeTextArea,
  ctx: Ctx,
  data: string | null,
  inputType = 'insertText',
  enabled = true
) => {
  const ev = new FakeInputEvent('beforeinput', { data, inputType, target: el, currentTarget: el });
  const done = handleTypingBeforeInputEvent(ctx, ev, undefined, enabled);
  if (!ev.defaultPrevented && data !== null) {
    el.setRangeText(data, el.selectionStart, el.selectionEnd, 'end');
  }
  await done;
  return ev;
};
const typeText = async (el: FakeTextArea, ctx: Ctx, text: string) => {
  for (const ch of text) await beforeInput(el, ctx, ch);
};
const keyDown = (ctx: Ctx, key: string, mods: object = {}) =>
  clearTypingContextOnKeyDown(new FakeKeyboardEvent('keydown', { key, ...mods }), ctx);

describe('Browser typing helpers', () => {
  it('types normally', async () => {
    const { el, ctx } = await setup('abc ');
    await typeText(el, ctx, 'namaste');
    expect(el.value).toBe('abc नमस्ते');
    const brahmi = await setup('', 'Brahmi');
    await typeText(brahmi.el, brahmi.ctx, 'kRShNa');
    expect(brahmi.el.value).toBe('𑀓𑀾𑀱𑁆𑀡');
  });

  it('still intercepts the React `onBeforeInput` polyfill (textInput, no inputType)', async () => {
    const { el, ctx } = await setup();
    for (const ch of 'ka') {
      const ev = new FakeInputEvent('textInput', { data: ch, target: el, currentTarget: el });
      ev.inputType = undefined as unknown as string;
      await handleTypingBeforeInputEvent(ctx, { nativeEvent: ev, ...ev, preventDefault() {} });
    }
    expect(el.value).toBe('क');
  });

  it('starts a new context after the caret is moved by a click', async () => {
    const { el, ctx } = await setup('abc ');
    await typeText(el, ctx, 'ka');
    el.setCaret(2);
    await typeText(el, ctx, 'i');
    expect(el.value).toBe('abइc क');
  });

  it('starts a new context after a click inside the same word', async () => {
    const { el, ctx } = await setup('');
    await typeText(el, ctx, 'namaste ');
    await typeText(el, ctx, 'k');
    el.setCaret(2); // after नम
    await typeText(el, ctx, 'a');
    expect(el.value).toBe('नमअस्ते क्');
  });

  it('starts a new context after the text was changed by someone else', async () => {
    const { el, ctx } = await setup('');
    await typeText(el, ctx, 'ka');
    el.value = ''; // eg. a form reset or a controlled input cleared by the app
    el.setCaret(0);
    await typeText(el, ctx, 'i');
    expect(el.value).toBe('इ');
  });

  it('clears the context on navigation and deletion keys with modifiers', () => {
    const ctx = createTypingContext('Devanagari');
    for (const [key, mods] of [
      ['ArrowLeft', { ctrlKey: true }],
      ['ArrowRight', { altKey: true }],
      ['Home', { ctrlKey: true }],
      ['End', { metaKey: true }],
      ['Backspace', { ctrlKey: true }],
      ['Delete', { altKey: true }],
      ['ArrowUp', { metaKey: true }]
    ] as const) {
      expect(keyDown(ctx, key, mods), `${JSON.stringify(mods)} + ${key}`).toBe(true);
    }
    // shortcuts which do not move the caret or change the text keep the context
    expect(keyDown(ctx, 'c', { ctrlKey: true })).toBe(false);
    expect(keyDown(ctx, 'Shift')).toBe(false);
  });

  for (const inputType of ['deleteWordBackward', 'deleteContentBackward', 'historyUndo']) {
    it(`starts a new context after a \`${inputType}\` edit`, async () => {
      const { el, ctx } = await setup('abc ');
      await typeText(el, ctx, 'ka');
      await beforeInput(el, ctx, null, inputType);
      el.value = 'abc '; // the browser removes क
      el.setCaret(4);
      await typeText(el, ctx, 'i');
      expect(el.value).toBe('abc इ');
    });
  }

  it('does not transliterate a single character paste or drop', async () => {
    for (const inputType of ['insertFromPaste', 'insertFromDrop', 'insertReplacementText']) {
      const { el, ctx } = await setup();
      await typeText(el, ctx, 'k');
      const ev = await beforeInput(el, ctx, 'a', inputType);
      expect(ev.defaultPrevented, inputType).toBe(false);
      expect(el.value, inputType).toBe('क्a');
      await typeText(el, ctx, 'i');
      expect(el.value, inputType).toBe('क्aइ');
    }
  });

  it('starts a new context after typing while disabled', async () => {
    const { el, ctx } = await setup();
    await typeText(el, ctx, 'k');
    await beforeInput(el, ctx, 'x', 'insertText', false);
    expect(el.value).toBe('क्x');
    await typeText(el, ctx, 'a');
    expect(el.value).toBe('क्xअ');
  });

  it('applies keys typed before the script data is loaded in order', async () => {
    for (const script of ['Telugu', 'Brahmi'] as const) {
      const el = new FakeTextArea();
      const ctx = createTypingContext(script);
      // all keys arrive before `ready` resolves
      await Promise.all([...'kama'].map((ch) => beforeInput(el, ctx, ch)));

      const ref = await setup('', script);
      await typeText(ref.el, ref.ctx, 'kama');
      expect(el.value, script).toBe(ref.el.value);
    }
  });
});

describe('Browser typing helpers: deprecated `input` event handler', () => {
  /** Like a browser: inserts the data, then fires `input` */
  const input = async (el: FakeTextArea, ctx: Ctx, data: string, enabled = true) => {
    el.setRangeText(data, el.selectionStart, el.selectionEnd, 'end');
    const ev = new FakeInputEvent('input', {
      data,
      inputType: 'insertText',
      target: el,
      currentTarget: el
    });
    await handleTypingInputEvent(ctx, ev, undefined, enabled);
  };

  it('types normally', async () => {
    const { el, ctx } = await setup('abc ');
    for (const ch of 'namaste') await input(el, ctx, ch);
    expect(el.value).toBe('abc नमस्ते');
  });

  it('starts a new context after the caret is moved by a click', async () => {
    const { el, ctx } = await setup('abc ');
    for (const ch of 'ka') await input(el, ctx, ch);
    el.setCaret(2);
    await input(el, ctx, 'i');
    expect(el.value).toBe('abइc क');
  });

  it('starts a new context after typing while disabled', async () => {
    const { el, ctx } = await setup();
    await input(el, ctx, 'k');
    await input(el, ctx, 'x', false);
    await input(el, ctx, 'a');
    expect(el.value).toBe('क्xअ');
  });
});
