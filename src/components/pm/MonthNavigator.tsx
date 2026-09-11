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
    <div className="inline-flex items-center overflow-hidden rounded-full border border-indigo-950 bg-[#172554] shadow-lg shadow-indigo-950/25">
      <Button
        variant="default"
        size="icon"
        onClick={prev}
        aria-label="Previous month"
        className="group h-9 w-9 rounded-none bg-indigo-600 text-white hover:bg-indigo-500"
      >
        <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-active:scale-90" strokeWidth={3} />
      </Button>
      <span className="flex min-w-[176px] items-center justify-center gap-2 bg-[#172554] px-4 py-1.5">
        <CalendarDays className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} />
        <span className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold tracking-tight text-white">{MONTH_NAMES[month]}</span>
          <span className="text-[11px] font-medium tabular-nums text-indigo-200">{year}</span>
        </span>
      </span>
      <Button
        variant="default"
        size="icon"
        onClick={next}
        aria-label="Next month"
        className="group h-9 w-9 rounded-none bg-indigo-600 text-white hover:bg-indigo-500"
      >
        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-active:scale-90" strokeWidth={3} />
      </Button>
    </div>
  );
};

export default MonthNavigator;
