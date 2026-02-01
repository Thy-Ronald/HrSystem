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
import Dashboard from './pages/Dashboard';
import RankingPage from './pages/StaffRanking';
import Monitoring from './pages/Monitoring';
import Auth from './pages/Auth';
import Layout from './components/Layout';

// Map URL paths to page keys
const routeMap = {
  '/': 'contract-form',
  '/contract-form': 'contract-form',
  '/dashboard': 'dashboard',
  '/staff-ranking': 'staff-ranking',
  '/ranking': 'staff-ranking', // Alias
  '/monitoring': 'monitoring',
};

// Get page from URL
function getPageFromPath() {
  const path = window.location.pathname;
  return routeMap[path] || 'contract-form';
}

// Set URL from page
function setPathFromPage(page, replace = false) {
  const pathMap = {
    'contract-form': '/contract-form',
    'dashboard': '/dashboard',
    'staff-ranking': '/staff-ranking',
    'monitoring': '/monitoring',
  };
  const path = pathMap[page] || '/';
  if (window.location.pathname !== path) {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
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

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7f9' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading...</Typography>
        </Box>
      </Box>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <Auth onLogin={() => setCurrentPage('dashboard')} />;
  }

  // Check if user is trying to access contract-form but is not admin
  if (currentPage === 'contract-form' && user?.role !== 'admin') {
    return (
      <Layout currentPath={currentPage} onNavigate={handleNavigate}>
        <Container maxWidth="sm" sx={{ py: 10 }}>
          <Box sx={{ textAlign: 'center' }}>
            <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2, opacity: 0.8 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Access Denied</Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Only administrators can access the employee contract management screen.
            </Typography>
            <Button
              variant="contained"
              onClick={() => handleNavigate('dashboard')}
              sx={{ borderRadius: 1, textTransform: 'none', px: 4 }}
            >
              Go to Dashboard
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout currentPath={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'contract-form' && <ContractForm />}
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'staff-ranking' && <RankingPage />}
      {currentPage === 'monitoring' && <Monitoring />}
    </Layout>
  );
}

import { MonitoringProvider } from './contexts/MonitoringContext';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MonitoringProvider>
          <AppContent />
        </MonitoringProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

