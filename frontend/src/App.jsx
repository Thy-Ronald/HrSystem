import { useState, useEffect } from 'react';
import ContractForm from './pages/ContractForm';
import Dashboard from './pages/Dashboard';
import RankingPage from './pages/StaffRanking';
import Monitoring from './pages/Monitoring';
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
function setPathFromPage(page) {
  const pathMap = {
    'contract-form': '/contract-form',
    'dashboard': '/dashboard',
    'staff-ranking': '/staff-ranking',
    'monitoring': '/monitoring',
  };
  const path = pathMap[page] || '/';
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState(() => getPageFromPath());

  // Sync URL on initial load
  useEffect(() => {
    setPathFromPage(currentPage);
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

  return (
    <Layout currentPath={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'contract-form' && <ContractForm />}
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'staff-ranking' && <RankingPage />}
      {currentPage === 'monitoring' && <Monitoring />}
    </Layout>
  );
}

export default App;
