import { formatDate } from '../../../utils/format';
import { getContractStatus, calculateTotalSalary, calculateExpirationDate } from '../utils/contractHelpers';

/**
 * Individual contract row component
 */
export function ContractListItem({ contract, currentTime, onEdit, onDelete }) {
  const contractTotalSalary = calculateTotalSalary(contract);
  const label = getContractStatus(contract, currentTime);
  
  // Calculate expiration date for display
  const getExpirationDateDisplay = () => {
    const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths);
    if (expirationDate) {
      return formatDate(expirationDate);
    }
    return contract.expirationDate ? formatDate(contract.expirationDate) : 'N/A';
  };

  return (
    <div 
      className="flex items-center gap-4 px-4 py-3 border-b border-[#f1f3f4] hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] hover:z-10 cursor-pointer group"
    >
      <div className="w-40 font-bold text-[#202124] truncate">
        {contract.name}
      </div>

      <div className="w-36 text-[#202124] truncate">
        {contract.position}
      </div>

      <div className="w-20 text-[#5f6368]">
        {contract.termMonths} mo
      </div>

      <div className="w-24 text-[#5f6368] text-sm">
        {formatDate(contract.assessmentDate)}
      </div>

      <div className="flex-1">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${label.color}`}>
          {label.text}
        </span>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <div className="w-24 text-right font-bold text-[#202124]">
          ₱{contractTotalSalary.toLocaleString()}
        </div>
        <div className="w-24 text-right text-sm text-[#5f6368]">
          {getExpirationDateDisplay()}
        </div>
        <div className="w-20 flex items-center justify-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(contract.id);
            }}
            className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368] transition-colors"
            title="Edit Contract"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(contract.id, contract.name);
            }}
            className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368] transition-colors"
            title="Delete Contract"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
