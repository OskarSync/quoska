/**
 * DatePicker — Calendar-based date picker using shadcn Calendar + Popover.
 * Shows German locale, formatted as DD.MM.YYYY.
 */

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale/de";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  /** Controlled date value as ISO string (YYYY-MM-DD) or empty string */
  value: string;
  /** Called when the user picks a date. Receives ISO string or empty string. */
  onChange: (value: string) => void;
  /** Label text */
  label?: string;
  /** Placeholder when no date is selected */
  placeholder?: string;
  /** HTML id for the trigger button */
  id?: string;
  /** Additional class on the wrapper */
  className?: string;
  /** Disable the picker */
  disabled?: boolean;
  /** Minimum selectable date (ISO string) */
  minDate?: string;
  /** Maximum selectable date (ISO string) */
  maxDate?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Datum wählen",
  id,
  className,
  disabled,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only date for calendar widget
  const selected = value ? new Date(value + "T12:00:00") : undefined;

  const disabledMatchers: import("react-day-picker").Matcher[] = [];
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only min/max for calendar widget
  if (minDate) disabledMatchers.push({ before: new Date(minDate + "T12:00:00") });
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only min/max for calendar widget
  if (maxDate) disabledMatchers.push({ after: new Date(maxDate + "T12:00:00") });

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-8",
                !value && "text-muted-foreground",
              )}
              disabled={disabled}
            />
          }
        >
          <CalendarIcon className="mr-2 size-4" />
          {value
            // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only formatting
            ? format(new Date(value + "T12:00:00"), "dd.MM.yyyy")
            : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" side="bottom" align="start">
          <Calendar
            mode="single"
            locale={de}
            selected={selected}
            onSelect={(date: Date | undefined) => {
              if (date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${d}`);
              } else {
                onChange("");
              }
              setOpen(false);
            }}
            disabled={disabledMatchers}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
