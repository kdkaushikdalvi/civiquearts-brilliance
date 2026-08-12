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
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <Button
        variant="default"
        size="icon"
        onClick={prev}
        aria-label="Previous month"
        className="h-9 w-9 rounded-none bg-slate-800 text-white hover:bg-slate-950"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={3} />
      </Button>
      <span className="min-w-[168px] px-5 py-2 text-center text-sm font-bold tracking-wide text-slate-800">
        {MONTH_NAMES[month]} {year}
      </span>
      <Button
        variant="default"
        size="icon"
        onClick={next}
        aria-label="Next month"
        className="h-9 w-9 rounded-none bg-slate-800 text-white hover:bg-slate-950"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={3} />
      </Button>
    </div>
  );
};

export default MonthNavigator;
