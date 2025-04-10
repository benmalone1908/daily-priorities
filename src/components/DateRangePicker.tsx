
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn, formatDateToDisplay, createConsistentDate } from "@/lib/utils";
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
    // Use noon-based date to avoid timezone issues
    const selectedDate = date ? createConsistentDate(date) : undefined;
    
    const newRange: DateRange = {
      from: selectedDate,
      to: dateRange?.to
    };
    
    onDateRangeChange(selectedDate ? newRange : undefined);
    setStartOpen(false);
    
    console.log(`Selected start date: ${selectedDate?.toISOString() || 'undefined'}`);
    if (selectedDate) {
      console.log(`Normalized start date display: ${formatDateToDisplay(selectedDate)}`);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    // Use noon-based date to avoid timezone issues
    const selectedDate = date ? createConsistentDate(date) : undefined;
    
    // Only set the end date if there's a start date
    if (!dateRange?.from && selectedDate) {
      const newRange: DateRange = {
        from: selectedDate,
        to: selectedDate
      };
      onDateRangeChange(newRange);
    } else if (selectedDate) {
      const newRange: DateRange = {
        from: dateRange?.from,
        to: selectedDate
      };
      onDateRangeChange(newRange);
    } else {
      // If end date is cleared, keep just the start date
      onDateRangeChange(dateRange?.from ? { from: dateRange.from } : undefined);
    }
    
    setEndOpen(false);
    
    console.log(`Selected end date: ${selectedDate?.toISOString() || 'undefined'}`);
    if (selectedDate) {
      console.log(`Normalized end date display: ${formatDateToDisplay(selectedDate)}`);
    }
  };

  const handleReset = () => {
    onDateRangeChange(undefined);
    setStartOpen(false);
    setEndOpen(false);
    console.log("Date range reset");
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
                formatDateToDisplay(dateRange.from)
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
                formatDateToDisplay(dateRange.to)
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
