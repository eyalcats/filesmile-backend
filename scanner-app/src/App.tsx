import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/components/auth';
import { Toaster } from '@/components/ui/sonner';
import { getDirection, type Locale } from './i18n';
import HomePage from './pages/HomePage';

function App() {
  const { i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const dir = getDirection(locale);

  return (
    <>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      <Toaster position={dir === 'rtl' ? 'top-left' : 'top-right'} />
    </>
  );
}

export default App;
