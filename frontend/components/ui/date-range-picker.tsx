"use client"
import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"

const formatDateForInput = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string): Date | null => {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

export function CalendarDateRangePicker({ date, setDate, className }: any) {
  const [fromValue, setFromValue] = React.useState(formatDateForInput(date.from));
  const [toValue, setToValue] = React.useState(formatDateForInput(date.to));
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFromValue(formatDateForInput(date.from));
  }, [date.from]);

  React.useEffect(() => {
    setToValue(formatDateForInput(date.to));
  }, [date.to]);

  React.useEffect(() => {
    setErrorMessage(null);
  }, [date.from, date.to]);

  const isValidRange = (fromDate: Date, toDate: Date) => fromDate.getTime() <= toDate.getTime();

  const commitFromDate = () => {
    const parsedDate = parseDateInput(fromValue);
    if (parsedDate) {
      if (!isValidRange(parsedDate, date.to)) {
        setErrorMessage('La fecha inicial no puede ser mayor que la fecha final.');
        setFromValue(formatDateForInput(date.from));
        return;
      }

      setErrorMessage(null);
      setDate({ ...date, from: parsedDate });
      setFromValue(formatDateForInput(parsedDate));
    } else {
      setFromValue(formatDateForInput(date.from));
    }
  };

  const commitToDate = () => {
    const parsedDate = parseDateInput(toValue);
    if (parsedDate) {
      if (!isValidRange(date.from, parsedDate)) {
        setErrorMessage('La fecha final no puede ser menor que la fecha inicial.');
        setToValue(formatDateForInput(date.to));
        return;
      }

      setErrorMessage(null);
      setDate({ ...date, to: parsedDate });
      setToValue(formatDateForInput(parsedDate));
    } else {
      setToValue(formatDateForInput(date.to));
    }
  };

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 px-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 ${className}`}>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
        <CalendarIcon size={18} className="text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Rango:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          value={fromValue} 
          onChange={(e) => setFromValue(e.target.value)}
          onBlur={commitFromDate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitFromDate();
            }
          }}
          className="bg-transparent text-sm font-semibold text-slate-700 outline-none focus:text-blue-600 cursor-pointer dark:text-slate-100 dark:focus:text-blue-400 [color-scheme:light] dark:[color-scheme:dark]"
        />
        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
        <input 
          type="date" 
          value={toValue} 
          onChange={(e) => setToValue(e.target.value)}
          onBlur={commitToDate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitToDate();
            }
          }}
          className="bg-transparent text-sm font-semibold text-slate-700 outline-none focus:text-blue-600 cursor-pointer dark:text-slate-100 dark:focus:text-blue-400 [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>
    </div>
  )
}
