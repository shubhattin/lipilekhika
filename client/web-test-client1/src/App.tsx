import { batch, createEffect, createSignal, For } from 'solid-js';
import { transliterate, preloadScriptData } from '../../../packages/js/src/index';
import { SCRIPT_LIST, type script_list_type } from '../../../packages/js/src/utils/lang_list';

const SCRIPTS = SCRIPT_LIST as script_list_type[];
const DEFAULT_FROM: script_list_type = 'Devanagari';
const DEFAULT_TO: script_list_type = 'Romanized';

function App() {
  const [fromScript, setFromScript] = createSignal<script_list_type>(DEFAULT_FROM);
  const [toScript, setToScript] = createSignal<script_list_type>(DEFAULT_TO);
  const [inputText, setInputText] = createSignal('');
  const [outputText, setOutputText] = createSignal('');

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      const result = await transliterate(inputText(), fromScript(), toScript());
      console.log(result);
      setOutputText(result);
    } catch (error) {
      console.error(error);
      setOutputText('');
    }
  };

  const handleSwap = () => {
    const currentFrom = fromScript();
    const currentTo = toScript();
    batch(() => {
      setFromScript(currentTo);
      setToScript(currentFrom);
    });
  };

  createEffect(() => {
    preloadScriptData(fromScript());
    preloadScriptData(toScript());
  });

  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div class="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <form
          class="space-y-8 rounded-3xl bg-slate-900/60 p-8 shadow-2xl ring-1 shadow-black/40 ring-white/5 backdrop-blur"
          onSubmit={handleSubmit}
        >
          <div class="flex flex-col items-stretch gap-4 sm:grid sm:grid-cols-3 sm:items-end sm:gap-6">
            <label class="flex flex-col gap-2 sm:w-full">
              <span class="text-sm tracking-wider text-slate-400 uppercase">From script</span>
              <select
                class="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-base transition outline-none hover:border-teal-400/60 focus:border-teal-400 focus:ring focus:ring-teal-500/30"
                value={fromScript()}
                onChange={(event) => setFromScript(event.currentTarget.value as script_list_type)}
              >
                <For each={SCRIPTS}>
                  {(script) => (
                    <option value={script} class="bg-slate-900 text-white">
                      {script}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <button
              type="button"
              aria-label="Swap scripts"
              class="inline-flex h-12 w-12 items-center justify-center self-center rounded-full border border-slate-800/70 bg-slate-950/80 text-lg font-semibold text-teal-200 shadow-sm shadow-black/30 transition hover:border-teal-400/60 hover:text-teal-100 focus-visible:ring focus-visible:ring-teal-500/40 focus-visible:outline-none sm:h-12 sm:w-12 sm:justify-self-center"
              onClick={handleSwap}
            >
              ⇄
            </button>
            <label class="flex flex-col gap-2 sm:w-full">
              <span class="text-sm tracking-wider text-slate-400 uppercase">To script</span>
              <select
                class="rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-base transition outline-none hover:border-teal-400/60 focus:border-teal-400 focus:ring focus:ring-teal-500/30"
                value={toScript()}
                onChange={(event) => setToScript(event.currentTarget.value as script_list_type)}
              >
                <For each={SCRIPTS}>
                  {(script) => (
                    <option value={script} class="bg-slate-900 text-white">
                      {script}
                    </option>
                  )}
                </For>
              </select>
            </label>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <label class="flex flex-col gap-3">
              <span class="text-sm tracking-wider text-slate-400 uppercase">Source text</span>
              <textarea
                class="min-h-[180px] rounded-2xl border border-slate-800/60 bg-slate-950/80 px-5 py-4 text-base text-white placeholder:text-slate-500 focus:border-teal-400 focus:ring focus:ring-teal-500/30"
                placeholder="Text"
                value={inputText()}
                onInput={(event) => setInputText(event.currentTarget.value)}
              />
            </label>

            <label class="flex flex-col gap-3">
              <span class="text-sm tracking-wider text-slate-400 uppercase">Converted output</span>
              <textarea
                class="min-h-[180px] rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-base text-teal-100"
                value={outputText()}
                readOnly
              />
            </label>
          </div>

          <div class="flex flex-col items-center justify-center gap-3">
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-lime-400 px-8 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-teal-500/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Convert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
