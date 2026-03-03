import { useEffect, useRef, useState } from 'react';
import { Usage } from '../../../../backend/features/usage/usage.types';
import { THROTTLE_TIME, UsageContext } from '.';
import { fetchUsage } from './usage.service';
import { throttle } from '../../../../shared/throttle';
import { UsageContextType } from './usage.types';

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<Usage>();
  const [status, setStatus] = useState<UsageContextType['status']>('loading');
  const isUpdatingRef = useRef<boolean>(false);

  async function handleUpdateUsage() {
    if (isUpdatingRef.current) {
      return;
    }
    isUpdatingRef.current = true;

    const { data } = await fetchUsage();

    if (data) {
      setUsage(data);
      setStatus('ready');
    } else {
      setStatus('error');
    }
    isUpdatingRef.current = false;
  }

  const throttledUpdate = useRef(throttle(handleUpdateUsage, THROTTLE_TIME)).current;

  useEffect(() => {
    setStatus('loading');
    handleUpdateUsage();
    const listener = window.electron.onRemoteChanges(throttledUpdate);
    return () => {
      listener();
    };
  }, []);

  return (
    <UsageContext.Provider value={{ usage, status, refreshUsage: handleUpdateUsage }}>{children}</UsageContext.Provider>
  );
}
