import { defineStore } from "pinia";
import { ref } from "vue";

export type ToastTone = "success" | "error";

export type Toast = {
  id: number;
  text: string;
  tone: ToastTone;
  /** Shows "Rückgängig"; the toast then stays a bit longer. */
  undo?: () => void;
};

/** Errors stay a bit longer, because they usually need reading. */
const TOAST_DURATION_MS: Record<ToastTone, number> = { success: 3200, error: 6000 };
const UNDO_DURATION_MS = 6500;

/** Short feedback at the bottom of the screen ("Verschoben", "Umbenennen fehlgeschlagen"). */
export const useToastStore = defineStore("toast", () => {
  const toasts = ref<Toast[]>([]);
  let nextId = 1;

  function show({
    text,
    tone = "success",
    undo,
  }: {
    text: string;
    tone?: ToastTone;
    undo?: () => void;
  }): void {
    const id = nextId++;
    toasts.value = [...toasts.value, { id, text, tone, undo }];
    setTimeout(() => dismiss(id), undo ? UNDO_DURATION_MS : TOAST_DURATION_MS[tone]);
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  return { toasts, show, dismiss };
});
