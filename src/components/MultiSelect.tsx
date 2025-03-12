
import * as React from "react";
import { Check, ChevronsUpDown, Square, CheckSquare, ListChecks, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  isWide?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  popoverClassName,
  isWide = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="relative flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          >
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn(
            "p-0 bg-background shadow-lg", 
            isWide ? "w-[500px]" : "", 
            popoverClassName
          )} 
          align="start"
        >
          <div className="max-h-[300px] overflow-auto p-1">
            <div
              className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground border-b border-border"
              onClick={handleSelectAll}
            >
              <div className="flex items-center justify-center mr-2 h-4 w-4 flex-shrink-0">
                {selected.length === options.length ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="truncate">Select All</span>
            </div>
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                  selected.includes(option.value) ? "bg-accent/50" : ""
                )}
                onClick={() => handleSelect(option.value)}
              >
                <div className="flex items-center justify-center mr-2 h-4 w-4 flex-shrink-0">
                  {selected.includes(option.value) ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "whitespace-nowrap overflow-hidden text-ellipsis pr-2",
                  isWide ? "max-w-[450px]" : "truncate"
                )}>
                  {option.label}
                </span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      {selected.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-0 translate-x-[calc(100%+4px)] h-8 w-8"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
