
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn, formatDateToDisplay } from "@/lib/utils";
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
  displayDateRangeSummary?: boolean;
  dateRangeSummaryText?: string | null;
}

export default function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  displayDateRangeSummary = false,
  dateRangeSummaryText = null,
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

  const formatDisplayDate = (date: Date) => {
    try {
      // Use MM/DD/YYYY format for consistency with the dataset
      return formatDateToDisplay(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return format(date, "LLL dd, y");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {/* Start Date Picker */}
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              id="start-date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
              size="sm"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                formatDisplayDate(dateRange.from)
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
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* End Date Picker */}
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              id="end-date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange?.to && "text-muted-foreground"
              )}
              size="sm"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.to ? (
                formatDisplayDate(dateRange.to)
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
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Reset Button */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleReset}
          className="text-xs h-7 px-2"
        >
          Reset
        </Button>
      </div>
      
      {/* Date Range Summary - moved as a separate element with improved styling */}
      {displayDateRangeSummary && dateRangeSummaryText && (
        <p className="text-xs text-muted-foreground mt-1">
          {dateRangeSummaryText}
        </p>
      )}
    </div>
  );
}
