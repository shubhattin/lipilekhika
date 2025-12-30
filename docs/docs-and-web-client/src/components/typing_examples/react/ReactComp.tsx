import { useState, useMemo, useEffect } from 'react';
import { SCRIPT_LIST, type ScriptListType } from 'lipilekhika';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';

export default function ReactComp() {
  const [text, setText] = useState('');
  const [script, setScript] = useState<ScriptListType>('Devanagari');

  const ctx = useMemo(() => createTypingContext(script), [script]);

  // Eagerly trigger preloading by accessing contexts
  // to avoid lazy evaluation of `useMemo`
  useEffect(() => {
    ctx.ready;
  }, [ctx]);

  return (
    <div className="mx-auto max-w-[700px] p-8 font-sans">
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-xl font-bold tracking-tight text-slate-200">React</h1>
        <p className="text-[0.95rem] text-slate-400">Lipi Lekhika Typing Tool Usage Example</p>
      </div>

      <div className="mb-7">
        <label
          htmlFor="script-select"
          className="mb-2 block text-sm font-semibold tracking-wide text-slate-300"
        >
          Select Script
        </label>
        <select
          id="script-select"
          value={script}
          onChange={(e) => setScript(e.target.value as ScriptListType)}
          className="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-base text-slate-200 transition-all duration-200 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        >
          {SCRIPT_LIST.map((script) => (
            <option key={script} value={script}>
              {script}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-7">
        <textarea
          placeholder="Start typing here..."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(ctx, e, (newValue) => setText(newValue))
          }
          onBlur={() => ctx.clearContext()}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
          className="min-h-[150px] w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        ></textarea>
      </div>
    </div>
  );
}
