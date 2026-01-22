import { useState, useRef, useEffect } from 'react';
import { exportContractsToSpreadsheet, exportContractsToPDF } from '../utils/exportContracts';

/**
 * Export dropdown component with PDF and Spreadsheet options
 */
export function ExportDropdown({ contracts, currentTime, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportPDF = async () => {
    if (contracts && contracts.length > 0) {
      await exportContractsToPDF(contracts, currentTime);
      setIsOpen(false);
    }
  };

  const handleExportSpreadsheet = async () => {
    if (contracts && contracts.length > 0) {
      await exportContractsToSpreadsheet(contracts, currentTime);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#f8f9fa] text-[#5f6368] border border-[#dadce0] rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export contracts"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Export</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-[#dadce0] rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={handleExportPDF}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#202124] hover:bg-[#f8f9fa] text-left"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ea4335]">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Export as PDF</span>
            </button>
            <button
              onClick={handleExportSpreadsheet}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#202124] hover:bg-[#f8f9fa] text-left"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#34a853]">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Export as Spreadsheet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
