
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { parseDateString } from "@/lib/utils";

export const useDataProcessor = (rawData: any[]) => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dataSize, setDataSize] = useState<number>(0);
  
  useEffect(() => {
    if (!rawData || rawData.length === 0) return;
    
    // Process the raw data
    const processedData = rawData.map(row => {
      const newRow = { ...row };
      
      if (newRow.DATE) {
        try {
          const date = parseDateString(newRow.DATE);
          if (date) {
            newRow.DATE = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
          } else {
            console.error(`Invalid date format: ${newRow.DATE}`);
          }
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }
      
      ["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].forEach(field => {
        const normalizedField = Object.keys(newRow).find(key => key.toUpperCase() === field);
        if (normalizedField) {
          newRow[normalizedField] = Number(newRow[normalizedField]) || 0;
        }
      });
      
      return newRow;
    });
    
    setData(processedData);
    setDataSize(processedData.length);
  }, [rawData]);
  
  useEffect(() => {
    if (data.length > 0) {
      const uniqueDates = Array.from(new Set(data.map(row => row.DATE)))
        .filter(date => date !== 'Totals')
        .sort();
      
      console.log(`Dataset has ${uniqueDates.length} unique dates:`, uniqueDates);
      
      if (uniqueDates.length > 0) {
        console.log(`Date range in dataset: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
        
        const dateCounts: Record<string, number> = {};
        data.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);
        
        if (!dateRange || !dateRange.from) {
          try {
            // Parse dates and create proper Date objects
            const parsedDates = uniqueDates
              .map(dateStr => parseDateString(dateStr))
              .filter(Boolean) as Date[];
              
            if (parsedDates.length > 0) {
              // Sort dates chronologically
              parsedDates.sort((a, b) => a.getTime() - b.getTime());
              
              const minDate = parsedDates[0];
              const maxDate = parsedDates[parsedDates.length - 1];
              
              if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
                setDateRange({ from: minDate, to: maxDate });
                console.log(`Auto-set date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
              }
            }
          } catch (e) {
            console.error("Error auto-setting date range:", e);
          }
        }
      }
    }
  }, [data, dateRange]);

  return {
    data,
    dateRange, 
    setDateRange,
    dataSize
  };
};
