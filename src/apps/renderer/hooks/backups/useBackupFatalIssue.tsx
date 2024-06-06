import { useEffect, useState } from 'react';
import { SyncErrorCause } from '../../../../shared/issues/SyncErrorCause';
import { shortMessages } from '../../messages/virtual-drive-error';
import { useTranslationContext } from '../../context/LocalContext';

export function useBackupFatalIssue(id: number) {
  const [issue, setIssue] = useState<SyncErrorCause | undefined>(undefined);
  const { translate } = useTranslationContext();

  useEffect(() => {
    window.electron.getBackupFatalIssue(id).then(setIssue);
  }, []);

  function message() {
    if (!issue) {
      return undefined;
    }

    const key = shortMessages[issue];
    return translate(key);
  }

  return { issue, message };
}
