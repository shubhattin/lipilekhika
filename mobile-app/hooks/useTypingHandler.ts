import { useCallback, useEffect, useRef, useState } from "react";
import { createTypingContext } from "lipilekhika/typing";
import type { ScriptListType } from "lipilekhika";

type Selection = {
  start: number;
  end: number;
};

type Delta = {
  start: number;
  deletedCount: number;
  inserted: string;
};

type UseTypingHandlerArgs = {
  value: string;
  onValueChange: (nextValue: string) => void;
  typingEnabled: boolean;
  typingScript: ScriptListType;
  useNativeNumerals: boolean;
  includeInherentVowel: boolean;
};

const computeDelta = (prev: string, next: string): Delta | null => {
  if (prev === next) return null;

  let prefix = 0;
  const minLen = Math.min(prev.length, next.length);
  while (prefix < minLen && prev[prefix] === next[prefix]) {
    prefix += 1;
  }

  let prevSuffix = prev.length;
  let nextSuffix = next.length;
  while (
    prevSuffix > prefix &&
    nextSuffix > prefix &&
    prev[prevSuffix - 1] === next[nextSuffix - 1]
  ) {
    prevSuffix -= 1;
    nextSuffix -= 1;
  }

  return {
    start: prefix,
    deletedCount: prevSuffix - prefix,
    inserted: next.slice(prefix, nextSuffix),
  };
};

export function useTypingHandler({
  value,
  onValueChange,
  typingEnabled,
  typingScript,
  useNativeNumerals,
  includeInherentVowel,
}: UseTypingHandlerArgs) {
  const ctxRef = useRef(createTypingContext(typingScript));
  const readyRef = useRef(false);
  const lastValueRef = useRef(value);
  const selectionRef = useRef<Selection>({ start: 0, end: 0 });
  const ignoreValueRef = useRef<string | null>(null);
  const [selection, setSelection] = useState<Selection | undefined>(undefined);

  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  useEffect(() => {
    const ctx = createTypingContext(typingScript);
    ctxRef.current = ctx;
    readyRef.current = false;
    void ctx.ready.then(() => {
      readyRef.current = true;
    });
    ctx.updateUseNativeNumerals(useNativeNumerals);
    ctx.updateIncludeInherentVowel(includeInherentVowel);
    ctx.clearContext();
  }, [typingScript, useNativeNumerals, includeInherentVowel]);

  useEffect(() => {
    ctxRef.current.updateUseNativeNumerals(useNativeNumerals);
  }, [useNativeNumerals]);

  useEffect(() => {
    ctxRef.current.updateIncludeInherentVowel(includeInherentVowel);
  }, [includeInherentVowel]);

  useEffect(() => {
    if (!typingEnabled) {
      ctxRef.current.clearContext();
    }
  }, [typingEnabled]);

  const handleSelectionChange = useCallback((event: any) => {
    const nextSelection = event?.nativeEvent?.selection;
    if (!nextSelection) return;
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
  }, []);

  const handleBlur = useCallback(() => {
    ctxRef.current.clearContext();
  }, []);

  const handleChangeText = useCallback(
    (newValue: string) => {
      if (ignoreValueRef.current === newValue) {
        ignoreValueRef.current = null;
        lastValueRef.current = newValue;
        return;
      }

      const prevValue = lastValueRef.current;

      if (!typingEnabled || !readyRef.current) {
        lastValueRef.current = newValue;
        onValueChange(newValue);
        return;
      }

      const delta = computeDelta(prevValue, newValue);
      if (!delta) return;

      if (delta.deletedCount !== 0 || delta.inserted.length !== 1) {
        ctxRef.current.clearContext();
        lastValueRef.current = newValue;
        onValueChange(newValue);
        return;
      }

      const { diff_add_text, to_delete_chars_count } =
        ctxRef.current.takeKeyInput(delta.inserted);

      const replaceEnd = delta.start + delta.inserted.length;
      const replaceStart = Math.max(
        0,
        replaceEnd - to_delete_chars_count - delta.inserted.length,
      );
      const updatedValue =
        newValue.slice(0, replaceStart) +
        diff_add_text +
        newValue.slice(replaceEnd);
      const newCaret = replaceStart + diff_add_text.length;

      ignoreValueRef.current = updatedValue;
      lastValueRef.current = updatedValue;
      onValueChange(updatedValue);
      setSelection({ start: newCaret, end: newCaret });
    },
    [onValueChange, typingEnabled],
  );

  return {
    selection,
    handleChangeText,
    handleSelectionChange,
    handleBlur,
  };
}
