import { useState } from 'react';
import ContractForm from './pages/ContractForm';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

function App() {
  const [currentPage, setCurrentPage] = useState('contract-form');

  return (
    <Layout currentPath={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'contract-form' ? <ContractForm /> : <Dashboard />}
    </Layout>
  );
}

export default App;
