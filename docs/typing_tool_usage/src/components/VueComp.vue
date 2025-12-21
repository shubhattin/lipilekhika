<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import {
  SCRIPT_LIST,
  type ScriptListType
} from 'lipilekhika';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingInputEvent
} from 'lipilekhika/typing';

const textareaText = ref('');
const inputText = ref('');
const selectedScript = ref<ScriptListType>('Devanagari');

const textareaTypingContext = computed(() => createTypingContext(selectedScript.value));
const inputTypingContext = computed(() => createTypingContext(selectedScript.value));

// Eagerly access contexts to trigger background preloading
// to avoid lazy evaluation of `computed`
watchEffect(() => {
  textareaTypingContext.value.ready;
  inputTypingContext.value.ready;
});
</script>

<template>
  <div class="mx-auto max-w-[700px] p-8 font-sans">
    <div class="mb-10 text-center">
      <h1 class="mb-2 text-xl font-bold tracking-tight text-slate-200">Vue</h1>
      <p class="text-[0.95rem] text-slate-400">Lipi Lekhika Typing Tool Usage Example</p>
    </div>

    <div class="mb-7">
      <label for="script-select" class="mb-2 block text-sm font-semibold tracking-wide text-slate-300"
        >Select Script</label
      >
      <select
        id="script-select"
        v-model="selectedScript"
        class="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-base text-slate-200 transition-all duration-200 hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
      >
        <option v-for="script in SCRIPT_LIST" :key="script" :value="script">
          {{ script }}
        </option>
      </select>
    </div>

    <div class="mb-7">
      <textarea
        placeholder="Start typing here..."
        :value="textareaText"
        @input="
          (e) =>
            handleTypingInputEvent(
              textareaTypingContext,
              e,
              (newValue) => (textareaText = newValue)
            )
        "
        @blur="() => textareaTypingContext.clearContext()"
        @keydown="(e) => clearTypingContextOnKeyDown(e, textareaTypingContext)"
        class="min-h-[150px] w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
      ></textarea>
    </div>

    <div class="mb-7">
      <input
        type="text"
        placeholder="Type here..."
        :value="inputText"
        @input="
          (e) =>
            handleTypingInputEvent(
              inputTypingContext,
              e,
              (newValue) => (inputText = newValue)
            )
        "
        @blur="() => inputTypingContext.clearContext()"
        @keydown="(e) => clearTypingContextOnKeyDown(e, inputTypingContext)"
        class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  </div>
</template>

