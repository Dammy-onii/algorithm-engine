"use client";

import {
  useMemo,
  useRef,
  useState,
  useId,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  activeIdentifierRange,
  replaceActiveIdentifier,
} from "./conditionAutocomplete";

interface Props {
  value: string;
  suggestions: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

const INPUT =
  "w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500";
const MAX_VISIBLE_SUGGESTIONS = 12;

export function ConditionExpressionInput({
  value,
  suggestions,
  placeholder,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [caret, setCaret] = useState(value.length);
  const [highlighted, setHighlighted] = useState(0);
  const query = activeIdentifierRange(value, caret).query.toLowerCase();
  const allMatches = useMemo(
    () =>
      suggestions
        .filter((suggestion) => suggestion.toLowerCase().includes(query)),
    [query, suggestions],
  );
  const filtered = allMatches.slice(0, MAX_VISIBLE_SUGGESTIONS);

  const updateCaret = () => {
    const nextCaret = inputRef.current?.selectionStart ?? value.length;
    setCaret(nextCaret);
    setHighlighted(0);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    setCaret(event.target.selectionStart ?? event.target.value.length);
    setHighlighted(0);
    setOpen(true);
  };

  const choose = (identifier: string) => {
    const replacement = replaceActiveIdentifier(value, caret, identifier);
    onChange(replacement.value);
    setCaret(replacement.caret);
    setOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(
        replacement.caret,
        replacement.caret,
      );
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted(
        (current) => (current - 1 + filtered.length) % filtered.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(filtered[highlighted]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        className={INPUT}
        value={value}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={Boolean(open && filtered.length > 0)}
        onChange={handleChange}
        onFocus={() => {
          updateCaret();
          setOpen(true);
        }}
        onClick={updateCaret}
        onKeyUp={(event) => {
          if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) {
            updateCaret();
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
      />

      {open && filtered.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-44 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          {filtered.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(suggestion);
              }}
              className={`block w-full rounded px-2 py-1.5 text-left font-mono text-xs ${
                index === highlighted
                  ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
              }`}
            >
              {suggestion}
            </button>
          ))}
          {allMatches.length > filtered.length && (
            <p className="border-t border-zinc-100 px-2 py-1.5 text-[9px] text-zinc-400 dark:border-zinc-800">
              Showing {filtered.length} of {allMatches.length}. Type more to narrow the list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
