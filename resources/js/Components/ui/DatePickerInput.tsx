
/**
 * DatePickerInput
 * ─────────────────────────────────────────────────────
 * A dark-mode-friendly date picker wrapper.
 *
 * Usage (with React Hook Form):
 *   <DatePickerInput
 *     id="startDate"
 *     value={watch('startDate')}
 *     onChange={(v) => setValue('startDate', v)}
 *     error={!!errors.startDate}
 *   />
 *
 * Usage (uncontrolled / standalone):
 *   <DatePickerInput
 *     id="selectedDate"
 *     value={selectedDate}
 *     onChange={setSelectedDate}
 *   />
 */

import React, { useRef } from 'react';
import { CalendarDays } from 'lucide-react';

interface DatePickerInputProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}

export function DatePickerInput({
  id,
  value,
  onChange,
  error = false,
  disabled = false,
  className = '',
  min,
  max,
  placeholder = 'Select date',
}: DatePickerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    try {
      // Modern browsers: showPicker() opens the native date picker programmatically
      input.showPicker?.();
    } catch {
      input.focus();
      input.click();
    }
  };

  const borderClass = error
    ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/30'
    : 'border-slate-800 focus-within:border-cyan-500 focus-within:ring-cyan-500/30';

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Open date picker"
      onClick={openPicker}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
      className={`
        relative flex items-center w-full px-3 py-2
        bg-slate-950 border rounded-xl
        focus-within:ring-1
        transition-all cursor-pointer select-none
        ${borderClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {/* Hidden native date input — does the real work */}
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        // Make it invisible but keep it in the DOM so the picker can attach
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Styled visible display */}
      <span className={`flex-1 text-xs ${value ? 'text-slate-200' : 'text-slate-600'}`}>
        {displayValue || placeholder}
      </span>

      <CalendarDays className="h-3.5 w-3.5 text-slate-500 shrink-0 ml-2 pointer-events-none" />
    </div>
  );
}
