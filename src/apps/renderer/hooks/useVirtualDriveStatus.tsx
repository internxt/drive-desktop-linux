import { useEffect, useState } from 'react';
import { FuseDriveStatus } from '../../drive/fuse/FuseDriveStatus';

export default function useVirtualDriveStatus() {
  const [virtualDriveStatus, setVirtualDriveStatus] = useState<FuseDriveStatus>();

  useEffect(() => {
    window.electron
      .getVirtualDriveStatus()
      .then((status: FuseDriveStatus) => setVirtualDriveStatus(status))
      .catch((err) => {
        reportError(err);
      });
  }, []);

  useEffect(() => {
    const removeListener = window.electron.onVirtualDriveStatusChange((status) => {
      reportError('status changed');
      setVirtualDriveStatus(status.status);
    });

    return removeListener;
  }, []);

  return { virtualDriveStatus };
}
