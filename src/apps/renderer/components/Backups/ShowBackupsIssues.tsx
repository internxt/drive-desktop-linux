import { WarningCircle } from '@phosphor-icons/react';
import Button from '../Button';

interface ShowBackupsIssuesProps {
  show: () => void;
}

export function ShowBackupsIssues({ show }: ShowBackupsIssuesProps) {
  return (
    <div className="-mx-6 mt-2 flex items-center  border-t border-gray-10 px-6 pt-4 text-red ">
      <p className="flex-1">
        <WarningCircle size={18} weight="fill" className="mr-1 inline" />
        Last backup had some issues
      </p>
      <Button className="flex-none" variant="secondary" onClick={show}>
        See issues
      </Button>
    </div>
  );
}
