import { useState, useEffect } from 'react';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto text-blue-600 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
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
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <svg className="w-24 h-24 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Only administrators can access the employee contract management screen.
            </p>
            <button
              onClick={() => handleNavigate('dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
