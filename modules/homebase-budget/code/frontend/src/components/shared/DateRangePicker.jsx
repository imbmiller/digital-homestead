import { useState, useRef, useEffect } from "react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subWeeks, subMonths, addDays,
  differenceInCalendarDays, parseISO,
} from "date-fns";

const DEFAULT_ANCHOR = "2026-05-02";

function getAnchor() {
  return localStorage.getItem("homebase_pay_anchor") || DEFAULT_ANCHOR;
}

function getPayPeriod(offset = 0) {
  const today = new Date();
  const anchor = parseISO(getAnchor());
  const diff = differenceInCalendarDays(today, anchor);
  const periodIndex = Math.floor(diff / 14) + offset;
  const start = addDays(anchor, periodIndex * 14);
  const end = addDays(start, 13);
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
}

function buildPresets() {
  const today = new Date();
  const fmt = (d) => format(d, "yyyy-MM-dd");
  return [
    {
      label: "This Week",
      from: fmt(startOfWeek(today, { weekStartsOn: 1 })),
      to: fmt(endOfWeek(today, { weekStartsOn: 1 })),
    },
    {
      label: "Last Week",
      from: fmt(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })),
      to: fmt(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })),
    },
    {
      label: "This Month",
      from: fmt(startOfMonth(today)),
      to: fmt(endOfMonth(today)),
    },
    {
      label: "Last Month",
      from: fmt(startOfMonth(subMonths(today, 1))),
      to: fmt(endOfMonth(subMonths(today, 1))),
    },
    {
      label: "Last 30 Days",
      from: fmt(addDays(today, -29)),
      to: fmt(today),
    },
    {
      label: "This Year",
      from: fmt(startOfYear(today)),
      to: fmt(endOfYear(today)),
    },
    {
      label: "Pay Period",
      ...getPayPeriod(0),
    },
    {
      label: "Last Pay Period",
      ...getPayPeriod(-1),
    },
  ];
}

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(value?.from || "");
  const [customTo, setCustomTo] = useState(value?.to || "");
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (preset) => {
    onChange(preset);
    setOpen(false);
    setCustom(false);
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      onChange({ label: "Custom", from: customFrom, to: customTo });
      setOpen(false);
      setCustom(false);
    }
  };

  const presets = buildPresets();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white hover:border-gray-600 transition-colors"
      >
        <span className="text-gray-400 text-xs">Period:</span>
        <span className="font-medium">{value?.label ?? "Select"}</span>
        <span className="text-gray-500 text-xs ml-1">
          {value?.from && value?.to ? `${value.from} → ${value.to}` : ""}
        </span>
        <span className="text-gray-500 ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-72 py-1">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => select(p)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex justify-between items-center ${
                value?.label === p.label ? "text-blue-400" : "text-gray-200"
              }`}
            >
              <span>{p.label}</span>
              <span className="text-xs text-gray-500">{p.from} → {p.to}</span>
            </button>
          ))}

          <div className="border-t border-gray-800 mt-1 pt-1">
            <button
              onClick={() => setCustom((v) => !v)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 ${
                value?.label === "Custom" ? "text-blue-400" : "text-gray-200"
              }`}
            >
              Custom range…
            </button>
            {custom && (
              <div className="px-4 pb-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={applyCustom}
                  disabled={!customFrom || !customTo}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs py-1.5 rounded"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
