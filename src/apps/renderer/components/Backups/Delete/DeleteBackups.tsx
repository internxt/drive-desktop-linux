import { SecondaryText } from '../../SecondaryText';
import { SectionHeader } from '../../SectionHeader';
import Button from '../../Button';
import { ConfirmationModal } from './ConfirmationModal';
import { useState } from 'react';
import { useTranslationContext } from '../../../context/LocalContext';

export function DeleteBackups() {
  const [confirm, setConfirm] = useState(false);

  const { translate } = useTranslationContext();

  function toggleConfirmation() {
    setConfirm(!confirm);
  }

  return (
    <section>
      <SectionHeader>
        {translate('settings.backups.delete.title')}
      </SectionHeader>
      <SecondaryText>
        {translate('settings.backups.delete.explanation')}
      </SecondaryText>
      <Button variant="secondary" onClick={toggleConfirmation}>
        {translate('settings.backups.delete.action')}
      </Button>
      <ConfirmationModal show={confirm} handled={toggleConfirmation} />
    </section>
  );
}
