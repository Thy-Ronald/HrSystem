import { useState } from 'react';
import ContractForm from './pages/ContractForm';
import Dashboard from './pages/Dashboard';
import RankingPage from './pages/StaffRanking';
import Layout from './components/Layout';

function App() {
  const [currentPage, setCurrentPage] = useState('contract-form');

  return (
    <Layout currentPath={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'contract-form' && <ContractForm />}
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'staff-ranking' && <RankingPage />}
    </Layout>
  );
}

export default App;
