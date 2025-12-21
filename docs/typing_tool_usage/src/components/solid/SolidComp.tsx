import { createSignal, createMemo, createEffect } from 'solid-js';
import { SCRIPT_LIST, type ScriptListType } from 'lipilekhika';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingInputEvent
} from 'lipilekhika/typing';

export default function SolidComp() {
  const [textareaText, setTextareaText] = createSignal('');
  const [inputText, setInputText] = createSignal('');
  const [selectedScript, setSelectedScript] = createSignal<ScriptListType>('Devanagari');

  const textareaTypingContext = createMemo(() => createTypingContext(selectedScript()));
  const inputTypingContext = createMemo(() => createTypingContext(selectedScript()));

  // Eagerly access contexts to trigger background preloading
  // to avoid lazy evaluation of `createMemo`
  createEffect(() => {
    textareaTypingContext().ready;
    inputTypingContext().ready;
  });

  return (
    <div class="mx-auto max-w-[700px] p-8 font-sans">
      <div class="mb-10 text-center">
        <h1 class="mb-2 text-xl font-bold tracking-tight text-slate-200">SolidJS</h1>
        <p class="text-[0.95rem] text-slate-400">Lipi Lekhika Typing Tool Usage Example</p>
      </div>

      <div class="mb-7">
        <label
          for="script-select"
          class="mb-2 block text-sm font-semibold tracking-wide text-slate-300"
        >
          Select Script
        </label>
        <select
          id="script-select"
          value={selectedScript()}
          onChange={(e) => setSelectedScript(e.target.value as ScriptListType)}
          class="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-base text-slate-200 transition-all duration-200 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        >
          {SCRIPT_LIST.map((script) => (
            <option key={script} value={script}>
              {script}
            </option>
          ))}
        </select>
      </div>

      <div class="mb-7">
        <textarea
          placeholder="Start typing here..."
          value={textareaText()}
          onInput={(e) =>
            handleTypingInputEvent(textareaTypingContext(), e, (newValue) =>
              setTextareaText(newValue)
            )
          }
          onBlur={() => textareaTypingContext().clearContext()}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, textareaTypingContext())}
          class="min-h-[150px] w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        ></textarea>
      </div>

      <div class="mb-7">
        <input
          type="text"
          placeholder="Type here..."
          value={inputText()}
          onInput={(e) =>
            handleTypingInputEvent(inputTypingContext(), e, (newValue) => setInputText(newValue))
          }
          onBlur={() => inputTypingContext().clearContext()}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, inputTypingContext())}
          class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        />
      </div>
    </div>
  );
}
