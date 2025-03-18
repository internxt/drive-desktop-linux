import { BackupsPageContainer } from './BackupsPageContainer/BackupsPageContainer';

interface BackupsSectionProps {
  active: boolean;
  showBackedFolders: () => void;
  showIssues: () => void;
}

export default function BackupsSection({
  active,
  showBackedFolders,
  showIssues,
}: BackupsSectionProps) {
  return (
    <div className={`${active ? 'block' : 'hidden'} w-full`}>
      <BackupsPageContainer
        showBackedFolders={showBackedFolders}
        showIssues={showIssues}
      />
    </div>
  );
}
