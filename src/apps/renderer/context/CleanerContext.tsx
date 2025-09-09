import { createContext, ReactNode, useContext, useState } from 'react';
import { CleanerReport } from '../../../backend/features/cleaner/cleaner.types';
type CleanerContextType = {
  report: CleanerReport | null;
  loading: boolean;
  generateReport: () => Promise<void>;
};

const CleanerContext = createContext<CleanerContextType | undefined>(undefined);

export function CleanerProvider({ children }: { children: ReactNode }) {
  const [report, setReport] = useState<CleanerReport | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result: CleanerReport =
        await window.electron.cleaner.generateReport();
      setReport(result);
    } finally {
      setLoading(false);
    }
  };
  // TODO: add product availability check
  return (
    <CleanerContext.Provider
      value={{
        report,
        loading,
        generateReport,
      }}
    >
      {children}
    </CleanerContext.Provider>
  );
}

export function useCleaner(): CleanerContextType {
  const ctx = useContext(CleanerContext);
  if (!ctx) throw new Error('useCleaner must be used inside <CleanerProvider>');
  return ctx;
}
