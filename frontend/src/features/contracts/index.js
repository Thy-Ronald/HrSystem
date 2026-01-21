/**
 * Contracts feature module
 * Central export point for all contracts-related components, hooks, and utilities
 */

// Components
export { ContractList } from './components/ContractList';
export { ContractListItem } from './components/ContractListItem';
export { ContractListHeader } from './components/ContractListHeader';
export { ContractModal } from './components/ContractModal';
export { ContractFormFields } from './components/ContractFormFields';
export { ContractPagination } from './components/ContractPagination';
export { ContractToolbar } from './components/ContractToolbar';
export { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

// Hooks
export { useContracts } from './hooks/useContracts';
export { useContractForm } from './hooks/useContractForm';
export { useContractStatus } from './hooks/useContractStatus';

// Utilities
export { 
  calculateExpirationDate, 
  getContractStatus, 
  calculateTotalSalary, 
  filterContracts 
} from './utils/contractHelpers';
