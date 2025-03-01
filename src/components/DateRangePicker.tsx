import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export default function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handleStartDateSelect = (date: Date | undefined) => {
    const newRange: DateRange = {
      from: date,
      to: dateRange?.to
    };
    
    onDateRangeChange(date ? newRange : undefined);
    setStartOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    // Only set the end date if there's a start date
    if (!dateRange?.from && date) {
      const newRange: DateRange = {
        from: date,
        to: date
      };
      onDateRangeChange(newRange);
    } else if (date) {
      const newRange: DateRange = {
        from: dateRange?.from,
        to: date
      };
      onDateRangeChange(newRange);
    } else {
      // If end date is cleared, keep just the start date
      onDateRangeChange(dateRange?.from ? { from: dateRange.from } : undefined);
    }
    
    setEndOpen(false);
  };

  const handleReset = () => {
    onDateRangeChange(undefined);
    setStartOpen(false);
    setEndOpen(false);
  };

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {/* Start Date Picker */}
      <div>
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              id="start-date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                format(dateRange.from, "LLL dd, y")
              ) : (
                <span>Start Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={dateRange?.from}
              selected={dateRange?.from}
              onSelect={handleStartDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* End Date Picker */}
      <div>
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              id="end-date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange?.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.to ? (
                format(dateRange.to, "LLL dd, y")
              ) : (
                <span>End Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={dateRange?.to || dateRange?.from}
              selected={dateRange?.to}
              onSelect={handleEndDateSelect}
              disabled={(date) => 
                dateRange?.from ? date < dateRange.from : false
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Reset Button */}
      <div className="col-span-2 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleReset}
          className="mt-2"
        >
          Reset Dates
        </Button>
      </div>
    </div>
  );
}
