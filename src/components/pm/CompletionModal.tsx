import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Assignment } from "@/types/pm";
import { formatINR } from "@/lib/pmFormat";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  onSave: (data: { unitType: Assignment["unitType"]; quantity: number; rate: number; amount: number }) => void;
}

const DEFAULT_UNITS = ["Feet", "Per Page", "Per Address"];
const UNITS_KEY = "pm_unit_types";

const loadUnits = (): string[] => {
  try {
    const raw = localStorage.getItem(UNITS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_UNITS;
};

const CompletionModal = ({ open, onClose, assignment, onSave }: Props) => {
  const [units, setUnits] = useState<string[]>(loadUnits);
  const [unitType, setUnitType] = useState<Assignment["unitType"]>("Feet");
  const [quantity, setQuantity] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [errors, setErrors] = useState<{ q?: string; r?: string }>({});
  const [adding, setAdding] = useState(false);
  const [newUnit, setNewUnit] = useState("");

  useEffect(() => {
    localStorage.setItem(UNITS_KEY, JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    if (assignment && open) {
      setUnitType(assignment.unitType ?? units[0] ?? "Feet");
      setQuantity(assignment.quantity != null ? String(assignment.quantity) : "");
      setRate(assignment.rate != null ? String(assignment.rate) : "");
      setErrors({});
      setAdding(false);
      setNewUnit("");
      if (assignment.unitType && !units.includes(assignment.unitType)) {
        setUnits((u) => [...u, assignment.unitType as string]);
      }
    }
  }, [assignment, open]);

  const q = Number(quantity);
  const r = Number(rate);
  const amount = isFinite(q) && isFinite(r) ? q * r : 0;

  const handleAddUnit = () => {
    const v = newUnit.trim();
    if (!v) return toast.error("Enter a unit name");
    if (units.some((u) => u.toLowerCase() === v.toLowerCase()))
      return toast.error("Unit already exists");
    setUnits((u) => [...u, v]);
    setUnitType(v);
    setNewUnit("");
    setAdding(false);
    toast.success("Unit added");
  };

  const handleRemoveUnit = (u: string) => {
    if (DEFAULT_UNITS.includes(u)) return toast.error("Default units cannot be removed");
    setUnits((prev) => prev.filter((x) => x !== u));
    if (unitType === u) setUnitType(DEFAULT_UNITS[0]);
  };

  const handleSave = () => {
    const errs: typeof errors = {};
    if (!q || q <= 0) errs.q = "Quantity must be > 0";
    if (!r || r <= 0) errs.r = "Rate must be > 0";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({ unitType, quantity: q, rate: r, amount });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Project</DialogTitle>
        </DialogHeader>
        {assignment && (
          <div className="text-sm text-muted-foreground -mt-2">
            {assignment.projectName} → {assignment.siteName} ({assignment.assigneeName})
          </div>
        )}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Unit Type</Label>
              {!adding && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="text-xs text-saffron hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add new
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {units.map((u) => (
                <div key={u} className="relative group">
                  <button
                    type="button"
                    onClick={() => setUnitType(u)}
                    className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                      unitType === u
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {u}
                  </button>
                  {!DEFAULT_UNITS.includes(u) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(u)}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove ${u}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {adding && (
              <div className="flex gap-2 pt-1">
                <Input
                  autoFocus
                  placeholder="New unit name"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddUnit();
                    if (e.key === "Escape") { setAdding(false); setNewUnit(""); }
                  }}
                />
                <Button type="button" size="sm" onClick={handleAddUnit}>Add</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setAdding(false); setNewUnit(""); }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min={0}
              placeholder="50000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {errors.q && <p className="text-xs text-destructive">{errors.q}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Rate (₹)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min={0}
              placeholder="0.25"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
            {errors.r && <p className="text-xs text-destructive">{errors.r}</p>}
          </div>
          <div className="rounded-md bg-secondary/50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-lg font-bold text-foreground">{formatINR(amount || 0)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="gradient-saffron text-saffron-foreground">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionModal;
