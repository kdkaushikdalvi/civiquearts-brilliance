import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
}
interface Props {
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  placeholder?: string;
  emptyActionLabel?: string;
  onEmptyAction?: (query: string) => void;
  disabled?: boolean;
  title?: string;
  openUp?: boolean;
}

const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  emptyActionLabel,
  onEmptyAction,
  disabled,
  title,
  openUp = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const trimmedQuery = q.trim();
  const actionLabel =
    emptyActionLabel && trimmedQuery
      ? `${emptyActionLabel} "${trimmedQuery}"`
      : emptyActionLabel;

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
          "hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden",
          openUp ? "bottom-full mb-1" : "mt-1"
        )}>
          {title && (
            <div className="border-b border-border bg-secondary/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">
              {title}
            </div>
          )}
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              emptyActionLabel && onEmptyAction ? (
                <button
                  type="button"
                  onClick={() => {
                    const query = q.trim();
                    setOpen(false);
                    setQ("");
                    onEmptyAction(query);
                  }}
                  className="flex w-full items-center justify-center gap-2 p-3 text-sm text-saffron transition-colors hover:bg-saffron hover:text-white"
                >
                  <Plus className="h-4 w-4" /> {actionLabel}
                </button>
              ) : (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  {options.length === 0 ? "No entries yet" : "No matches"}
                </div>
              )
            ) : (
              filtered.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                    o.id === value && "bg-accent/50"
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.id === value && <Check className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>
          {emptyActionLabel && onEmptyAction && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const query = q.trim();
                setOpen(false);
                setQ("");
                onEmptyAction(query);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-saffron transition-colors hover:bg-saffron hover:text-white"
            >
              <Plus className="h-4 w-4" /> {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
