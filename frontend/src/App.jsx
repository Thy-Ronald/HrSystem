import { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Container
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ContractForm from './pages/ContractForm';
import Information from './pages/Information';

import RankingPage from './pages/StaffRanking';
import Monitoring from './pages/Monitoring';
import GithubAnalytics from './pages/GithubAnalytics';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import GlobalResumeSharingModal from './components/GlobalResumeSharingModal';

// Map URL paths to page keys
const routeMap = {
  '/': 'staff-ranking',
  '/contract-form': 'contract-form',
  '/information': 'information',
  '/staff-ranking': 'staff-ranking',
  '/ranking': 'staff-ranking', // Alias
  '/monitoring': 'monitoring',
  '/github-analytics': 'github-analytics',
  '/auth': 'auth',
  '/settings': 'settings',
};

// Get page from URL
function getPageFromPath() {
  const path = window.location.pathname;
  return routeMap[path] || 'staff-ranking';
}

// Set URL from page
function setPathFromPage(page, replace = false) {
  const pathMap = {
    'contract-form': '/contract-form',
    'information': '/information',
    'staff-ranking': '/staff-ranking',
    'monitoring': '/monitoring',
    'github-analytics': '/github-analytics',
    'auth': '/auth',
    'settings': '/settings',
  };
  const path = pathMap[page] || '/';
  const fullPath = path + window.location.search;

  if (window.location.pathname !== path) {
    if (replace) {
      window.history.replaceState({}, '', fullPath);
    } else {
      window.history.pushState({}, '', fullPath);
    }
  }
}

function AppContent() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => getPageFromPath());

  // Sync URL on initial load (use replaceState to avoid adding to history)
  useEffect(() => {
    setPathFromPage(currentPage, true);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate function that updates both state and URL
  const handleNavigate = (page) => {
    setCurrentPage(page);
    setPathFromPage(page);
  };

  // Redirect to dashboard if authenticated and on auth page
  useEffect(() => {
    console.log(`[App] Auth state change. Authenticated: ${isAuthenticated}, Current Page: ${currentPage}`);
    if (isAuthenticated && currentPage === 'auth') {
      console.log('[App] Redirecting authenticated user to staff-ranking');
      handleNavigate('staff-ranking');
    }
  }, [isAuthenticated, currentPage]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2, color: 'primary.main' }} />
          <Typography sx={{ color: 'text.secondary' }}>Loading...</Typography>
        </Box>
      </Box>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <Auth onLogin={() => setCurrentPage('staff-ranking')} />;
  }

  // Check if user is trying to access admin pages but is not admin
  const adminOnlyPages = ['contract-form', 'information'];
  if (adminOnlyPages.includes(currentPage) && user?.role !== 'admin') {
    return (
      <MonitoringProvider>
        <Layout currentPath={currentPage} onNavigate={handleNavigate}>
          <GlobalResumeSharingModal />
          <Container maxWidth="sm" sx={{ py: 10 }}>
            <Box sx={{ textAlign: 'center' }}>
              <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2, opacity: 0.8 }} />
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Access Denied</Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Only administrators can access this screen.
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleNavigate('staff-ranking')}
                sx={{ borderRadius: 1, textTransform: 'none', px: 4 }}
              >
                Go to Staff Ranking
              </Button>
            </Box>
          </Container>
        </Layout>
      </MonitoringProvider>
    );
  }

  return (
    <MonitoringProvider>
      <Layout currentPath={currentPage} onNavigate={handleNavigate}>
        <GlobalResumeSharingModal />
        {currentPage === 'contract-form' && <ContractForm />}
        {currentPage === 'information' && <Information />}

        {currentPage === 'staff-ranking' && <RankingPage onNavigate={handleNavigate} />}
        {currentPage === 'monitoring' && <Monitoring />}
        {currentPage === 'github-analytics' && <GithubAnalytics onNavigate={handleNavigate} />}
        {currentPage === 'settings' && <Settings />}
      </Layout>
    </MonitoringProvider>
  );
}

import { MonitoringProvider } from './contexts/MonitoringContext';
import { ToastProvider } from './components/Toast';

import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

