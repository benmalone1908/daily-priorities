
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SpendMode = 'default' | 'custom';

interface SpendSettingsContextType {
  spendMode: SpendMode;
  customCPM: number;
  setSpendMode: (mode: SpendMode) => void;
  setCustomCPM: (cpm: number) => void;
}

const SpendSettingsContext = createContext<SpendSettingsContextType | undefined>(undefined);

interface SpendSettingsProviderProps {
  children: ReactNode;
}

export const SpendSettingsProvider = ({ children }: SpendSettingsProviderProps) => {
  const [spendMode, setSpendMode] = useState<SpendMode>('default');
  const [customCPM, setCustomCPM] = useState<number>(15);

  return (
    <SpendSettingsContext.Provider value={{
      spendMode,
      customCPM,
      setSpendMode,
      setCustomCPM
    }}>
      {children}
    </SpendSettingsContext.Provider>
  );
};

export const useSpendSettings = (): SpendSettingsContextType => {
  const context = useContext(SpendSettingsContext);
  if (context === undefined) {
    throw new Error('useSpendSettings must be used within a SpendSettingsProvider');
  }
  return context;
};
