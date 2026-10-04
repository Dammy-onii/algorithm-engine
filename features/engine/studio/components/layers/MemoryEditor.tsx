"use client";

/**
 * MemoryEditor — visual editor for the Memory layer.
 *
 * The memory layer is an initial key/value object carried by the agent.
 * This editor surfaces it as an editable table — add/remove/rename keys,
 * edit string or number values. Shown live in the debug panel during a run.
 */

interface Props {
  memory: Record<string, unknown>;
  onChange: (memory: Record<string, unknown>) => void;
}

const FIELD = "rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

export function MemoryEditor({ memory, onChange }: Props) {
  const entries = Object.entries(memory);

  const updateKey = (oldKey: string, newKey: string) => {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(memory)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  };

  const updateValue = (key: string, raw: string) => {
    // Try to parse as number or boolean, otherwise keep as string
    let value: unknown = raw;
    if (raw === "true") value = true;
    else if (raw === "false") value = false;
    else if (!isNaN(Number(raw)) && raw.trim() !== "") value = Number(raw);
    onChange({ ...memory, [key]: value });
  };

  const remove = (key: string) => {
    const next = { ...memory };
    delete next[key];
    onChange(next);
  };

  const add = () => {
    const key = `key${entries.length + 1}`;
    onChange({ ...memory, [key]: "" });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
          What memory is
        </p>
        <p>
          Key/value data the controller carries from the first step. Values appear live in the debug
          panel. Numbers, booleans, and strings are all valid.
        </p>
        <p className="mt-1.5">
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">Note:</strong>{" "}
          memory is currently <em>carried and displayed only</em> — conditions cannot read
          it and functions cannot write it yet. It is the seed for future
          remember-where-I&apos;ve-been behaviour.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">No memory keys defined.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Keyed by position, not by the key name — the name is an editable
              field, so keying on it would remount the input on every keystroke. */}
          {entries.map(([key, value], index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                className={`${FIELD} w-40 font-mono`}
                value={key}
                placeholder="key"
                onChange={(e) => updateKey(key, e.target.value)}
              />
              <span className="text-zinc-400">:</span>
              <input
                className={`${FIELD} flex-1 font-mono`}
                value={String(value)}
                placeholder="value"
                onChange={(e) => updateValue(key, e.target.value)}
              />
              <button
                onClick={() => remove(key)}
                className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                title="Remove key"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={add}
        className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors dark:border-zinc-700"
      >
        + Add memory key
      </button>
    </div>
  );
}
