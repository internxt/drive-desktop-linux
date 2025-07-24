import './App.css';
import './localize/i18n.service';
import { Suspense, useEffect } from 'react';
import {
  HashRouter as Router,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { TranslationProvider } from './context/LocalContext';
import useLanguageChangedListener from './hooks/useLanguage';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import IssuesPage from './pages/Issues/IssuesPage';
import Settings from './pages/Settings';
import Widget from './pages/Widget';
import Migration from './pages/Migration';
import Feedback from './pages/Feedback';
import { useBackupNotifications } from './hooks/useBackupNotifications';
import { AuthGuard } from './components/AuthGuard';

function LocationWrapper({ children }: { children: JSX.Element }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.electron.pathChanged(pathname);
  }, [pathname]);

  return children;
}

export default function App() {
  useLanguageChangedListener();
  useBackupNotifications();

  return (
    <Router>
      <Suspense fallback={<></>}>
        <TranslationProvider>
          <LocationWrapper>
            <AuthGuard>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/process-issues" element={<IssuesPage />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/migration" element={<Migration />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<Widget />} />
              </Routes>
            </AuthGuard>
          </LocationWrapper>
        </TranslationProvider>
      </Suspense>
    </Router>
  );
}
