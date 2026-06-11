import { addMonths, format, parse } from "date-fns";

export default function MonthPicker({ value, onChange }) {
  const current = parse(value, "yyyy-MM", new Date());

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(format(addMonths(current, -1), "yyyy-MM"))}
        className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-white w-24 text-center">
        {format(current, "MMM yyyy")}
      </span>
      <button
        onClick={() => onChange(format(addMonths(current, 1), "yyyy-MM"))}
        className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
      >
        ›
      </button>
    </div>
  );
}
