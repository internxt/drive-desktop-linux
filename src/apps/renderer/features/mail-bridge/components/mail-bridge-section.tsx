import type { UserAvailableProducts } from '@internxt/drive-desktop-core/build/backend/features/payments/payments.types';
import { MailBridgeModule } from '@internxt/drive-desktop-core/build/frontend';
import type { LocalContextProps } from '@internxt/drive-desktop-core/build/frontend/frontend.types';
import { useTranslation } from 'react-i18next';
import { useTranslationContext } from '../../../context/LocalContext';

type Props = { availableProducts?: UserAvailableProducts };

export function MailBridgeSection({ availableProducts }: Readonly<Props>) {
  const {
    viewModel,
    accountEmail: mailAccountEmail,
    isLoadingInitialStatus,
    isStartOnLoginEnabled,
    setStartOnLogin,
    activate,
    resync,
    retry,
    turnOff,
  } = MailBridgeModule.useMailBridge(globalThis.window.electron.mailBridge);

  if (isLoadingInitialStatus) return <div className="h-full" aria-busy="true" />;

  return (
    <div className="h-full min-h-0 w-full min-w-0 [&>section]:px-5 [&>section]:py-6">
      <MailBridgeModule.MailBridgeView
        availableProducts={availableProducts}
        accountEmail={mailAccountEmail}
        useTranslationContext={useMailBridgeTranslation}
        onUpgradePlan={openPlans}
        onComparePlans={openPlans}
        viewModel={viewModel}
        isStartOnLoginEnabled={isStartOnLoginEnabled}
        onStartOnLoginChange={(enabled) => setStartOnLogin(enabled)}
        onCreateMailbox={openMail}
        onCheckMailbox={activate}
        onActivate={() => void activate()}
        onResync={async () => ({ data: undefined, error: (await resync()).error })}
        onTurnOff={() => void turnOff()}
        onRetry={() => void retry()}
        onViewLogs={() => void globalThis.window.electron.openLogs()}
        onContactSupport={() => void globalThis.window.electron.openUrl('https://help.internxt.com')}
      />
    </div>
  );
}

function openPlans() {
  void globalThis.window.electron.openUrl('https://drive.internxt.com/preferences?tab=plans');
}

function openMail() {
  void globalThis.window.electron.openUrl('https://mail.internxt.com');
}

function useMailBridgeTranslation(): LocalContextProps {
  const { language } = useTranslationContext();
  const { t } = useTranslation();
  return {
    language: language === 'es' || language === 'fr' || language === 'de' ? language : 'en',
    translate: (path, args) => String(t(path, { ...args })),
  };
}
