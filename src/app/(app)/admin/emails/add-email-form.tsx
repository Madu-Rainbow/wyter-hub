"use client";

import { useRef } from "react";

export function AddEmailForm({ addEmail }: { addEmail: (formData: FormData) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addEmail(formData);
        formRef.current?.reset();
      }}
      className="flex gap-2"
    >
      <input
        type="email"
        name="email"
        placeholder="nome@wyter.com.br"
        required
        className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Adicionar
      </button>
    </form>
  );
}
