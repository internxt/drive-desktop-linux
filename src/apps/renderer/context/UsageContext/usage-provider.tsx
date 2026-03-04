import { useEffect, useMemo, useRef, useState } from 'react';
import { Usage } from '../../../../backend/features/usage/usage.types';
import { THROTTLE_TIME, UsageContext } from '.';
import { fetchUsage } from './usage.service';
import { throttle } from '../../../../shared/throttle';
import { UsageContextType } from './usage.types';

export function UsageProvider({ children }: { readonly children: React.ReactNode }) {
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

  function refreshUsage() {
    handleUpdateUsage();
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

  const value = useMemo(() => ({ usage, status, refreshUsage }), [usage, status]);

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}
