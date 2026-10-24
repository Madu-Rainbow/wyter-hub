// biome-ignore-all lint/a11y: listbox ARIA com foco no campo de busca (aria-activedescendant); opções não focáveis por design
// biome-ignore-all lint/correctness/useExhaustiveDependencies: efeitos só ao abrir
"use client";

import { cn } from "cn";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type ComboboxOption = { value: string; label: string; hint?: string };

type Base = {
  options: ComboboxOption[];
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Mostra opção "Limpar" (campo opcional). */
  clearable?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};
type Single = Base & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
};
type Multi = Base & {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (v: string[]) => void;
};
export type ComboboxProps = Single | Multi;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Combobox(props: ComboboxProps) {
  const {
    options,
    name,
    placeholder = "Selecionar...",
    searchPlaceholder = "Pesquisar...",
    disabled,
    required,
    clearable,
    id,
    className,
  } = props;
  const uid = React.useId();
  const listId = `${uid}-list`;
  const multiple = props.multiple === true;

  const [inner, setInner] = React.useState<string[]>(() => {
    const d = props.defaultValue;
    return d === undefined ? [] : Array.isArray(d) ? d : d ? [d] : [];
  });
  const controlled = props.value !== undefined;
  const sel: string[] = controlled
    ? Array.isArray(props.value)
      ? props.value
      : props.value
        ? [props.value]
        : []
    : inner;

  function commit(next: string[]) {
    if (!controlled) setInner(next);
    if (props.multiple) props.onValueChange?.(next);
    else (props.onValueChange as ((v: string) => void) | undefined)?.(next[0] ?? "");
  }

  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const n = norm(q.trim());
    return n ? options.filter((o) => norm(`${o.label} ${o.hint ?? ""}`).includes(n)) : options;
  }, [options, q]);

  React.useEffect(() => {
    if (open) {
      setQ("");
      const i = options.findIndex((o) => sel.includes(o.value));
      setActive(Math.max(i, 0));
    }
  }, [open]);

  React.useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function toggle(v: string) {
    if (multiple) commit(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
    else {
      commit([v]);
      setOpen(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    const n = filtered.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (n ? (a + 1) % n : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (n ? (a - 1 + n) % n : 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(n - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[active];
      if (o) toggle(o.value);
    }
    // Esc é tratado pelo Popover (fecha e devolve o foco ao gatilho)
  }

  const selected = options.filter((o) => sel.includes(o.value));
  const hasValue = selected.length > 0;
  const aria = props["aria-label"];
  const activeId = filtered[active] ? `${uid}-opt-${active}` : undefined;

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        {required && !multiple && (
          // Campo nativo invisível: dá a validação "obrigatório" do navegador ao formulário.
          <input
            tabIndex={-1}
            aria-hidden
            required
            value={sel[0] ?? ""}
            onChange={() => {}}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
          />
        )}
        {name &&
          (multiple ? (
            sel.map((v) => <input key={v} type="hidden" name={name} value={v} />)
          ) : (
            <input type="hidden" name={name} value={sel[0] ?? ""} />
          ))}
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-haspopup="listbox"
            aria-label={aria}
            aria-labelledby={props["aria-labelledby"]}
            aria-required={required || undefined}
            disabled={disabled}
            data-slot="combobox"
            className={cn(
              "flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm dark:bg-input/30",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "aria-invalid:border-destructive disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {!hasValue && <span className="truncate text-muted-foreground">{placeholder}</span>}
              {hasValue && !multiple && <span className="truncate">{selected[0].label}</span>}
              {hasValue &&
                multiple &&
                selected.map((o) => (
                  <span
                    key={o.value}
                    className="inline-flex max-w-full items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                  >
                    <span className="truncate">{o.label}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`Remover ${o.label}`}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        commit(sel.filter((x) => x !== o.value));
                      }}
                    >
                      <X className="size-3" aria-hidden />
                    </span>
                  </span>
                ))}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) min-w-48"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}
        >
          <div className="flex items-center gap-2 border-b border-border px-2">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              aria-label={aria ? `Pesquisar: ${aria}` : "Pesquisar"}
              aria-controls={listId}
              aria-activedescendant={activeId}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            tabIndex={-1}
            className="max-h-[min(18rem,50vh)] overflow-y-auto p-1"
          >
            {clearable && hasValue && (
              <div
                role="presentation"
                className="cursor-pointer rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                onClick={() => {
                  commit([]);
                  setOpen(false);
                }}
              >
                Limpar
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                Nenhum resultado
              </div>
            )}
            {filtered.map((o, i) => {
              const on = sel.includes(o.value);
              return (
                <div
                  key={o.value}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={on}
                  data-idx={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                    i === active && "bg-secondary",
                  )}
                >
                  <Check
                    className={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && (
                    <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { Combobox };
