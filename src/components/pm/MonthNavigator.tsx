import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
      <Button
        variant="default"
        size="icon"
        onClick={prev}
        aria-label="Previous month"
        className="group h-9 w-9 rounded-none bg-blue-600 text-white hover:bg-blue-700"
      >
        <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-active:scale-90" strokeWidth={3} />
      </Button>
      <span className="flex min-w-[176px] items-center justify-center gap-2 px-4 py-1.5">
        <CalendarDays className="h-4 w-4 shrink-0 text-green-600" strokeWidth={2} />
        <span className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold tracking-tight text-slate-800">{MONTH_NAMES[month]}</span>
          <span className="text-[11px] font-medium tabular-nums text-slate-400">{year}</span>
        </span>
      </span>
      <Button
        variant="default"
        size="icon"
        onClick={next}
        aria-label="Next month"
        className="group h-9 w-9 rounded-none bg-blue-600 text-white hover:bg-blue-700"
      >
        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-active:scale-90" strokeWidth={3} />
      </Button>
    </div>
  );
};

export default MonthNavigator;
