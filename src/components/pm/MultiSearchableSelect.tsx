import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option { id: string; label: string }
interface Props { value: string[]; onChange: (ids: string[]) => void; options: Option[]; placeholder?: string }

const MultiSearchableSelect = ({ value, onChange, options, placeholder = "Select Assignee *" }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const selected = options.filter((option) => value.includes(option.id));
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    const close = (event: MouseEvent) => { if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return <div ref={wrap} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1">
      <span className={cn("flex min-w-0 flex-wrap gap-1", !selected.length && "text-muted-foreground")}>{selected.length ? selected.map((option) => <span key={option.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"><span className="truncate">{option.label}</span><X className="h-3 w-3 shrink-0" onClick={(event) => { event.stopPropagation(); toggle(option.id); }} /></span>) : placeholder}</span>
      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
    </button>
    {open && <div className="absolute bottom-full z-50 mb-1 w-full min-w-[220px] overflow-hidden rounded-md border border-border bg-popover shadow-lg">
      <div className="flex items-center border-b border-border px-2"><Search className="h-4 w-4 text-muted-foreground" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assignees..." className="flex-1 bg-transparent px-2 py-2 text-sm outline-none" /></div>
      <div className="max-h-56 overflow-y-auto p-1">{filtered.length ? filtered.map((option) => { const checked = value.includes(option.id); return <button key={option.id} type="button" onClick={() => toggle(option.id)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-secondary"><span className={cn("flex h-4 w-4 items-center justify-center rounded-sm border", checked && "border-primary bg-primary text-primary-foreground")}>{checked && <Check className="h-3 w-3" />}</span>{option.label}</button>; }) : <div className="p-3 text-center text-sm text-muted-foreground">No assignees found</div>}</div>
    </div>}
  </div>;
};
export default MultiSearchableSelect;
