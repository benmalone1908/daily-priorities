
import React, { useEffect, useState } from 'react';
import { useSpendSettings } from '@/contexts/SpendSettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DollarSign, Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function SpendSettings() {
  const { spendMode, customCPM, setSpendMode, setCustomCPM } = useSpendSettings();
  const [inputValue, setInputValue] = useState<string>(customCPM.toString());
  const [debouncedValue, setDebouncedValue] = useState<string>(customCPM.toString());
  
  useEffect(() => {
    // Update the input value when customCPM changes
    setInputValue(customCPM.toString());
    setDebouncedValue(customCPM.toString());
  }, [customCPM]);
  
  useEffect(() => {
    // Debounce the input value to update customCPM after user stops typing
    const timer = setTimeout(() => {
      if (debouncedValue !== inputValue) {
        setDebouncedValue(inputValue);
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue) && numValue > 0) {
          setCustomCPM(numValue);
        }
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [inputValue, debouncedValue, setCustomCPM]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 mr-1">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Spend:</span>
      </div>
      <Select value={spendMode} onValueChange={(value) => setSpendMode(value as 'default' | 'custom')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Spend Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default (CSV)</SelectItem>
          <SelectItem value="custom">Custom CPM</SelectItem>
        </SelectContent>
      </Select>
      
      {spendMode === 'custom' && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-[100px]"
              type="number"
              min="0.01"
              step="0.01"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="CPM"
              aria-label="Custom CPM value"
            />
          </div>
          <Label className="text-xs text-muted-foreground">CPM</Label>
        </div>
      )}
    </div>
  );
}
