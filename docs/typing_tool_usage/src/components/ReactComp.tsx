import { useState, useMemo } from 'react';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingInputEvent,
  SCRIPT_LIST,
  type ScriptListType
} from 'lipilekhika';

export default function ReactComp() {
  const [textareaText, setTextareaText] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedScript, setSelectedScript] = useState<ScriptListType>('Devanagari');

  const textareaTypingContext = useMemo(
    () => createTypingContext(selectedScript),
    [selectedScript]
  );
  const inputTypingContext = useMemo(() => createTypingContext(selectedScript), [selectedScript]);

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
          value={selectedScript}
          onChange={(e) => setSelectedScript(e.target.value as ScriptListType)}
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
          value={textareaText}
          onInput={(e) =>
            handleTypingInputEvent(textareaTypingContext, e as any, (newValue) =>
              setTextareaText(newValue)
            )
          }
          onBlur={() => textareaTypingContext.clearContext()}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e as any, textareaTypingContext)}
          className="min-h-[150px] w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        ></textarea>
      </div>

      <div className="mb-7">
        <input
          type="text"
          placeholder="Type here..."
          value={inputText}
          onInput={(e) =>
            handleTypingInputEvent(inputTypingContext, e, (newValue) => setInputText(newValue))
          }
          onBlur={() => inputTypingContext.clearContext()}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e as any, inputTypingContext)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        />
      </div>
    </div>
  );
}
