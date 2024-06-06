import { SecondaryText } from '../../components/SecondaryText';
import { SectionHeader } from '../../components/SectionHeader';
import Button from '../../components/Button';

export function DeleteBackups() {
  return (
    <section>
      <SectionHeader>Delete backup</SectionHeader>
      <SecondaryText>
        This backup will be removed from the cloud, all folders and files will
        remain in this computer
      </SecondaryText>
      <Button variant="secondary">Delete backup</Button>
    </section>
  );
}
