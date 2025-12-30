<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { SCRIPT_LIST, type ScriptListType } from 'lipilekhika';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';

const text = ref('');
const script = ref<ScriptListType>('Devanagari');

const ctx = computed(() => createTypingContext(script.value));

// Eagerly access contexts to trigger background preloading
// to avoid lazy evaluation of `computed`
watchEffect(() => {
  ctx.value.ready;
});
</script>

<template>
  <div class="mx-auto max-w-[700px] p-8 font-sans">
    <div class="mb-10 text-center">
      <h1 class="mb-2 text-xl font-bold tracking-tight text-slate-200">Vue</h1>
      <p class="text-[0.95rem] text-slate-400">Lipi Lekhika Typing Tool Usage Example</p>
    </div>

    <div class="mb-7">
      <label
        for="script-select"
        class="mb-2 block text-sm font-semibold tracking-wide text-slate-300"
        >Select Script</label
      >
      <select
        id="script-select"
        v-model="script"
        class="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-base text-slate-200 transition-all duration-200 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
      >
        <option v-for="script in SCRIPT_LIST" :key="script" :value="script">
          {{ script }}
        </option>
      </select>
    </div>

    <div class="mb-7">
      <textarea
        placeholder="Start typing here..."
        v-model="text"
        @beforeinput="(e) => handleTypingBeforeInputEvent(ctx, e, (newValue) => (text = newValue))"
        @blur="() => ctx.clearContext()"
        @keydown="(e) => clearTypingContextOnKeyDown(e, ctx)"
        class="min-h-[150px] w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-200 transition-all duration-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
      ></textarea>
    </div>
  </div>
</template>
