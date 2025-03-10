
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
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
          {selected.length === 0
            ? placeholder
            : `${selected.length} selected`}
          <span className="ml-2 text-muted-foreground">▼</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="max-h-[300px] overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                selected.includes(option.value) && "bg-accent"
              )}
              onClick={() => handleSelect(option.value)}
            >
              <span className={cn("mr-2 h-4 w-4 border rounded flex items-center justify-center", 
                selected.includes(option.value) ? "bg-primary border-primary" : "border-input"
              )}>
                {selected.includes(option.value) && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </span>
              {option.label}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
