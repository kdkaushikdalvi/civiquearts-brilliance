import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

const MonthNavigator = ({ month, year, onChange }: Props) => {
  const prev = () => (month === 0 ? onChange(11, year - 1) : onChange(month - 1, year));
  const next = () => (month === 11 ? onChange(0, year + 1) : onChange(month + 1, year));
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 via-amber-50 to-emerald-50 px-2 py-1 shadow-card">
      <Button
        variant="ghost"
        size="icon"
        onClick={prev}
        aria-label="Previous month"
        className="rounded-full bg-white/80 text-sky-600 hover:bg-sky-100 hover:text-sky-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[160px] rounded-full bg-white/80 px-4 py-1 text-center font-semibold text-slate-800 shadow-sm">
        {MONTH_NAMES[month]} {year}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={next}
        aria-label="Next month"
        className="rounded-full bg-white/80 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MonthNavigator;
