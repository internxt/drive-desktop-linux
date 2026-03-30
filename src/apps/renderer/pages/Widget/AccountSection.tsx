import { useEffect, useState } from 'react';
import bytes from 'bytes';

import { User } from '../../../main/types';
import { useTranslationContext } from '../../context/LocalContext';
import { useUsage } from '../../context/UsageContext/useUsage';

export function AccountSection() {
  const { translate } = useTranslationContext();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    window.electron.getUser().then(setUser);
  }, []);

  const { usage, status } = useUsage();

  let displayUsage: string;

  if (status === 'loading') {
    displayUsage = 'Loading...';
  } else if (usage) {
    displayUsage = `${bytes.format(usage.usageInBytes)} ${translate(
      'widget.header.usage.of',
    )} ${usage.isInfinite ? '∞' : bytes.format(usage.limitInBytes)}`;
  } else {
    displayUsage = '';
  }

  return (
    <div className="flex flex-1 space-x-2.5 truncate" data-automation-id="headerAccountSection">
      <div className="relative z-0 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-base font-semibold uppercase text-primary before:absolute before:inset-0 before:-z-1 before:rounded-full before:bg-primary/20 dark:text-white dark:before:bg-primary/75">
        {`${user?.name.charAt(0) ?? ''}${user?.lastname.charAt(0) ?? ''}`}
      </div>

      <div className="flex flex-1 flex-col truncate">
        <p className="truncate text-sm font-medium text-gray-100" title={user?.email}>
          {user?.email}
        </p>
        <p className="text-xs text-gray-50">{displayUsage}</p>
      </div>
    </div>
  );
}
