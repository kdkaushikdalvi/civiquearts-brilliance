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

interface Props {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  onSave: (data: { unitType: Assignment["unitType"]; quantity: number; rate: number; amount: number }) => void;
}

const UNITS: Array<NonNullable<Assignment["unitType"]>> = ["Feet", "Per Page", "Per Address"];

const CompletionModal = ({ open, onClose, assignment, onSave }: Props) => {
  const [unitType, setUnitType] = useState<Assignment["unitType"]>("Feet");
  const [quantity, setQuantity] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [errors, setErrors] = useState<{ q?: string; r?: string }>({});

  useEffect(() => {
    if (assignment && open) {
      setUnitType(assignment.unitType ?? "Feet");
      setQuantity(assignment.quantity != null ? String(assignment.quantity) : "");
      setRate(assignment.rate != null ? String(assignment.rate) : "");
      setErrors({});
    }
  }, [assignment, open]);

  const q = Number(quantity);
  const r = Number(rate);
  const amount = isFinite(q) && isFinite(r) ? q * r : 0;

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
          <DialogTitle>Complete Assignment</DialogTitle>
        </DialogHeader>
        {assignment && (
          <div className="text-sm text-muted-foreground -mt-2">
            {assignment.projectName} → {assignment.siteName} ({assignment.assigneeName})
          </div>
        )}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Unit Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {UNITS.map((u) => (
                <button
                  key={u}
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
              ))}
            </div>
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
