import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  selectionStart: number | null = 0;
  selectionEnd: number | null = 0;
  /** -1 when the element has no `maxlength`, like the DOM property */
  maxLength = -1;
  setRangeText(text: string, start: number, end: number, mode: string) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    if (mode === 'end') this.selectionStart = this.selectionEnd = start + text.length;
  }
  /** Moves the caret, like a mouse click or touch would (no keydown, no input event) */
  setCaret(pos: number) {
    this.selectionStart = this.selectionEnd = pos;
  }
  /** Selects a range, like a mouse drag or Shift + arrows would */
  select(start: number, end: number) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
  setSelectionRange(start: number, end: number) {
    this.select(start, end);
  }
}
class FakeInput extends FakeTextArea {}
/** `<input type="email">` / `type="number"`: no selection API, `setRangeText` throws */
class FakeEmailInput extends FakeInput {
  selectionStart = null;
  selectionEnd = null;
  setRangeText(): never {
    throw new Error(
      "InvalidStateError: The input element's type ('email') does not support selection."
    );
  }
}

/** What the browser does for an edit it is not prevented from making */
const browserInsert = (el: FakeTextArea, data: string) => {
  if (el.selectionStart === null || el.selectionEnd === null) {
    el.value += data;
    return;
  }
  const replaced = el.selectionEnd - el.selectionStart;
  // the browser does not let typing grow the text past `maxlength`
  if (el.maxLength >= 0 && el.value.length - replaced + data.length > el.maxLength) return;
  FakeTextArea.prototype.setRangeText.call(el, data, el.selectionStart, el.selectionEnd, 'end');
};

// Stubbed by hand, not with `vi.stubGlobal`, as the tests also run under `bun test`
const FAKE_GLOBALS = {
  InputEvent: FakeInputEvent,
  KeyboardEvent: FakeKeyboardEvent,
  HTMLTextAreaElement: FakeTextArea,
  HTMLInputElement: FakeInput
};
const globals = globalThis as Record<string, unknown>;
const original_globals = new Map<string, PropertyDescriptor | undefined>();
beforeAll(() => {
  for (const [name, value] of Object.entries(FAKE_GLOBALS)) {
    original_globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    globals[name] = value;
  }
});
afterAll(() => {
  for (const [name, descriptor] of original_globals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globals[name];
  }
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
  if (!ev.defaultPrevented && data !== null) browserInsert(el, data);
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

  it('replaces a selection with the transliterated key', async () => {
    const { el, ctx } = await setup('hello world');
    el.select(0, 5);
    const ev = await beforeInput(el, ctx, 'k');
    expect(ev.defaultPrevented).toBe(true);
    await typeText(el, ctx, 'Sha');
    expect(el.value).toBe('क्ष world');
    // a selection in the middle of a word starts a new context there
    el.select(el.value.length - 3, el.value.length); // "rld"
    await typeText(el, ctx, 'ma');
    expect(el.value).toBe('क्ष woम');
  });

  it('does not grow the text past `maxlength`', async () => {
    const { el, ctx } = await setup();
    el.maxLength = 3;
    await typeText(el, ctx, 'namaste');
    // `s` and `t` would make it 4 units and are dropped, then `e` starts a new context and fits
    expect(el.value).toBe('नमए');

    const two = await setup();
    two.el.maxLength = 2;
    await typeText(two.el, two.ctx, 'ka'); // क् (2 units) then क (1)
    expect(two.el.value).toBe('क');
    const ev = await beforeInput(two.el, two.ctx, 'k'); // कक् would be 3 units
    expect(ev.defaultPrevented).toBe(true); // not typed raw either
    expect(two.el.value).toBe('क');
  });

  it('keeps the selected text when the script data fails to load', async () => {
    const el = new FakeTextArea();
    el.value = 'hello world';
    el.select(0, 5);
    const failed = Promise.reject(new Error('fetch failed'));
    failed.catch(() => {});
    const ctx = { ...createTypingContext('Devanagari'), ready: failed };
    const ev = new FakeInputEvent('beforeinput', {
      data: 'k',
      inputType: 'insertText',
      target: el,
      currentTarget: el
    });
    await expect(handleTypingBeforeInputEvent(ctx, ev)).rejects.toThrow('fetch failed');
    expect(el.value).toBe('hello world');
  });

  it('reports the new value to `onValueChange`', async () => {
    const values: string[] = [];
    const type = (el: FakeTextArea, ctx: Ctx, data: string) => {
      const ev = new FakeInputEvent('beforeinput', {
        data,
        inputType: 'insertText',
        target: el,
        currentTarget: el
      });
      return handleTypingBeforeInputEvent(ctx, ev, (v) => values.push(v));
    };
    const { el, ctx } = await setup('hello world');
    el.select(0, 5);
    await type(el, ctx, 'k');
    expect(values).toEqual(['क् world']);

    // a selection removed, then the key dropped at `maxlength`: the removal is still reported
    const limited = await setup('hello world');
    limited.el.maxLength = 7; // " world" + क् would be 8 units
    limited.el.select(0, 5);
    values.length = 0;
    await type(limited.el, limited.ctx, 'k');
    expect(limited.el.value).toBe(' world');
    expect(values).toEqual([' world']);
  });

  it('leaves inputs without a selection API (email, number) to the browser', async () => {
    const el = new FakeEmailInput();
    const ctx = createTypingContext('Devanagari');
    await ctx.ready;
    for (const ch of 'ka') {
      const ev = await beforeInput(el, ctx, ch);
      expect(ev.defaultPrevented).toBe(false);
    }
    expect(el.value).toBe('ka');
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

  describe('keys typed while the script data is loading', () => {
    /** A context whose `ready` resolves (or fails) only when the test says so */
    const heldContext = async (script: Script = 'Devanagari') => {
      const real = createTypingContext(script);
      await real.ready;
      let release!: () => void;
      let fail!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        release = resolve;
        fail = reject;
      });
      return { ctx: { ...real, ready }, release, fail };
    };
    /** Like `beforeInput`, but does not wait for the handler (it waits for the script data) */
    const press = (
      el: FakeTextArea,
      ctx: Ctx,
      data: string,
      onValueChange?: (value: string) => void
    ) => {
      const ev = new FakeInputEvent('beforeinput', {
        data,
        inputType: 'insertText',
        target: el,
        currentTarget: el
      });
      const done = handleTypingBeforeInputEvent(ctx, ev, onValueChange);
      if (!ev.defaultPrevented) browserInsert(el, data);
      return done;
    };
    const pressAll = (el: FakeTextArea, ctx: Ctx, text: string) =>
      [...text].map((ch) => press(el, ctx, ch));

    it('shows the keys where they are typed, then transliterates them', async () => {
      const el = new FakeTextArea();
      el.value = 'XY';
      el.setCaret(2);
      const { ctx, release } = await heldContext();
      const pending = pressAll(el, ctx, 'ka');
      el.setCaret(0); // a click at the start while the data is loading
      pending.push(...pressAll(el, ctx, 'ga'));
      expect(el.value).toBe('gaXYka'); // the browser inserted the keys

      release();
      await Promise.all(pending);
      expect(el.value).toBe('गXYक');
      expect([el.selectionStart, el.selectionEnd]).toEqual([1, 1]);

      // the run at the caret continues its context
      await beforeInput(el, ctx, 'm');
      expect(el.value).toBe('गम्XYक');
    });

    it('transliterates queued keys in order (Telugu, Brahmi)', async () => {
      for (const script of ['Telugu', 'Brahmi'] as const) {
        const el = new FakeTextArea();
        const { ctx, release } = await heldContext(script);
        const pending = pressAll(el, ctx, 'kama');
        release();
        await Promise.all(pending);

        const ref = await setup('', script);
        await typeText(ref.el, ref.ctx, 'kama');
        expect(el.value, script).toBe(ref.el.value);
      }
    });

    it('converts the text as it was edited while waiting', async () => {
      // a typo fixed with Backspace
      const el = new FakeTextArea();
      el.value = 'XY';
      el.setCaret(2);
      const { ctx, release } = await heldContext();
      const pending = pressAll(el, ctx, 'kam');
      await beforeInput(el, ctx, null, 'deleteContentBackward');
      el.setRangeText('', 4, 5, 'end'); // what the browser does for it
      pending.push(press(el, ctx, 'a'));
      release();
      await Promise.all(pending);
      expect(el.value).toBe('XYका');
      // the context continues
      await typeText(el, ctx, 'm');
      expect(el.value).toBe('XYकाम्');

      // a letter added inside the typed text
      const two = new FakeTextArea();
      const held = await heldContext();
      const twoPending = pressAll(two, held.ctx, 'nmaste');
      two.setCaret(1);
      twoPending.push(press(two, held.ctx, 'a'));
      held.release();
      await Promise.all(twoPending);
      expect(two.value).toBe('नमस्ते');
      // the caret was inside the typed text: it is put after it
      expect([two.selectionStart, two.selectionEnd]).toEqual([6, 6]);
    });

    it('does not convert text which was not typed while waiting', async () => {
      // Enter (not typed text) between two words
      const el = new FakeTextArea();
      const { ctx, release } = await heldContext();
      const pending = pressAll(el, ctx, 'ka');
      await beforeInput(el, ctx, '\n', 'insertLineBreak'); // the browser inserts it
      pending.push(...pressAll(el, ctx, 'ga'));
      release();
      await Promise.all(pending);
      expect(el.value).toBe('क\nग');

      // a paste, and text typed before
      const two = new FakeTextArea();
      two.value = 'om ';
      two.setCaret(3);
      const held = await heldContext();
      const twoPending = pressAll(two, held.ctx, 'ka');
      await beforeInput(two, held.ctx, 'xyz', 'insertFromPaste'); // the browser inserts it
      twoPending.push(...pressAll(two, held.ctx, 'ga'));
      held.release();
      await Promise.all(twoPending);
      expect(two.value).toBe('om कxyzग');

      // the app setting the value: only text still as typed is converted
      const app = new FakeTextArea();
      const third = await heldContext();
      const appPending = pressAll(app, third.ctx, 'ka');
      app.value = 'kax';
      third.release();
      await Promise.all(appPending);
      expect(app.value).toBe('कx');
      const replaced = new FakeTextArea();
      const fourth = await heldContext();
      const replacedPending = pressAll(replaced, fourth.ctx, 'ka');
      replaced.value = 'done';
      fourth.release();
      await Promise.all(replacedPending);
      expect(replaced.value).toBe('done');
    });

    it('handles a long text set while waiting', async () => {
      const el = new FakeTextArea();
      const { ctx, release } = await heldContext();
      const pending = pressAll(el, ctx, 'ka');
      const long = 'x'.repeat(200_000);
      el.value = 'ka' + long; // eg. the app loading a saved draft
      release();
      await Promise.all(pending);
      expect(el.value).toBe('क' + long);
    });

    it('converts keys typed over a selection', async () => {
      // Tab into a filled in field (selects all of it) or Ctrl+A, then typing
      const el = new FakeTextArea();
      el.value = 'old';
      el.select(0, 3);
      const { ctx, release } = await heldContext();
      const pending = pressAll(el, ctx, 'kaga');
      release();
      await Promise.all(pending);
      expect(el.value).toBe('कग');

      // the selection holds keys typed before
      const two = new FakeTextArea();
      const held = await heldContext();
      const twoPending = pressAll(two, held.ctx, 'ka');
      two.select(0, 2);
      twoPending.push(...pressAll(two, held.ctx, 'ga'));
      held.release();
      await Promise.all(twoPending);
      expect(two.value).toBe('ग');
    });

    it('converts the keys before a key which arrives after the data', async () => {
      const el = new FakeTextArea();
      const { ctx, release } = await heldContext();
      const pending = press(el, ctx, 'k');
      release();
      await ctx.ready; // the data is there, the queued key is not converted yet
      await beforeInput(el, ctx, 'a');
      expect(el.value).toBe('क');
      await pending;
      expect(el.value).toBe('क');
    });

    it('does not grow the text past `maxlength` when converting', async () => {
      const el = new FakeTextArea();
      el.maxLength = 1;
      const { ctx, release } = await heldContext();
      const pending = press(el, ctx, 'k'); // क् would be 2 units
      release();
      await pending;
      expect(el.value).toBe('k');

      // decided on the final length: `ka` -> क makes room for `k` -> क्
      const two = new FakeTextArea();
      two.value = 'X';
      two.setCaret(0);
      two.maxLength = 4;
      const held = await heldContext();
      const twoPending = pressAll(two, held.ctx, 'ka');
      two.setCaret(3);
      twoPending.push(press(two, held.ctx, 'k'));
      held.release();
      await Promise.all(twoPending);
      expect(two.value).toBe('कXक्');
    });

    it('reports the converted value to `onValueChange` once', async () => {
      const values: string[] = [];
      const el = new FakeTextArea();
      const { ctx, release } = await heldContext();
      const pending = [...'ka'].map((ch) => press(el, ctx, ch, (v) => values.push(v)));
      release();
      await Promise.all(pending);
      expect(values).toEqual(['क']);
    });

    it('converts the keys of every element and context', async () => {
      // two elements sharing a context
      const one = new FakeTextArea();
      const two = new FakeTextArea();
      const { ctx, release } = await heldContext();
      const pending = [press(one, ctx, 'k'), press(two, ctx, 'a')];
      release();
      await Promise.all(pending);
      expect(one.value).toBe('क्');
      expect(two.value).toBe('अ');
      // the context continues in the element typed in last only
      await beforeInput(one, ctx, 'a');
      expect(one.value).toBe('क्अ');

      // the script switched while waiting (a new context for the same element)
      const el = new FakeTextArea();
      const deva = await heldContext('Devanagari');
      const telugu = await heldContext('Telugu');
      const both = [...pressAll(el, deva.ctx, 'ka'), ...pressAll(el, telugu.ctx, 'ga')];
      telugu.release();
      deva.release();
      await Promise.all(both);
      expect(el.value).toBe('कగ');
    });

    it('converts the keys once when the deprecated `input` handler is also used', async () => {
      const el = new FakeTextArea();
      const { ctx, release } = await heldContext();
      const pending: Promise<unknown>[] = [];
      for (const ch of 'kama') {
        const init = { data: ch, inputType: 'insertText', target: el, currentTarget: el };
        const ev = new FakeInputEvent('beforeinput', init);
        pending.push(handleTypingBeforeInputEvent(ctx, ev));
        expect(ev.defaultPrevented).toBe(false);
        browserInsert(el, ch);
        pending.push(handleTypingInputEvent(ctx, new FakeInputEvent('input', init)));
      }
      release();
      await Promise.all(pending);
      expect(el.value).toBe('कम');
    });

    it('leaves the keys as typed when the script data fails to load', async () => {
      const el = new FakeTextArea();
      const { ctx, fail } = await heldContext();
      const pending = press(el, ctx, 'k');
      fail(new Error('fetch failed'));
      await expect(pending).rejects.toThrow('fetch failed');
      expect(el.value).toBe('k');
    });
  });
});

describe('Browser typing helpers: deprecated `input` event handler', () => {
  /** Like a browser: inserts the data, then fires `input` */
  const input = async (el: FakeTextArea, ctx: Ctx, data: string, enabled = true) => {
    const before = el.value;
    browserInsert(el, data);
    if (el.value === before) return; // blocked by `maxlength`: no `input` event
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

  it('does not grow the text past `maxlength`', async () => {
    const { el, ctx } = await setup();
    el.maxLength = 1;
    await input(el, ctx, 'k'); // the browser inserts "k", क् would be 2 units
    expect(el.value).toBe('');
  });

  it('leaves inputs without a selection API (email, number) to the browser', async () => {
    const el = new FakeEmailInput();
    const ctx = createTypingContext('Devanagari');
    await ctx.ready;
    for (const ch of 'ka') await input(el, ctx, ch);
    expect(el.value).toBe('ka');
  });
});
