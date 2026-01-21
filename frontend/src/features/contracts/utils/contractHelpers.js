/**
 * Utility functions for contract calculations and formatting
 */

/**
 * Calculate expiration date from assessment date and term months
 * @param {string|Date} assessmentDate - Assessment date
 * @param {number} termMonths - Contract term in months
 * @returns {Date|null} - Calculated expiration date
 */
export function calculateExpirationDate(assessmentDate, termMonths) {
  if (!assessmentDate || !termMonths) return null;
  
  const assessmentDateStr = assessmentDate;
  let assessment;
  
  if (typeof assessmentDateStr === 'string') {
    assessment = new Date(assessmentDateStr.includes('T') 
      ? assessmentDateStr 
      : assessmentDateStr + 'T00:00:00');
  } else {
    assessment = new Date(assessmentDateStr);
  }
  
  const expiration = new Date(assessment);
  expiration.setMonth(expiration.getMonth() + parseInt(termMonths));
  return expiration;
}

/**
 * Get contract status label and color based on expiration and resignation
 * @param {Object} contract - Contract object
 * @param {Date} currentTime - Current time for comparison
 * @returns {{text: string, color: string}} - Status label and color classes
 */
export function getContractStatus(contract, currentTime = new Date()) {
  // Check if terminated
  if (contract.resignationDate) {
    return { text: 'Terminated', color: 'bg-[#fce8e6] text-[#c5221f]' };
  }
  
  // Calculate expiration date
  const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths) 
    || (contract.expirationDate ? new Date(contract.expirationDate) : null);
  
  if (!expirationDate) {
    return { text: 'Active', color: 'bg-[#e6f4ea] text-[#1e8e3e]' };
  }
  
  // Normalize dates to midnight for accurate day comparison
  const today = new Date(currentTime);
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return { text: 'Expired', color: 'bg-[#fce8e6] text-[#c5221f]' };
  }
  if (daysUntilExpiry <= 30) {
    return { text: 'Expiring Soon', color: 'bg-[#fef7e0] text-[#ea8600]' };
  }
  return { text: 'Active', color: 'bg-[#e6f4ea] text-[#1e8e3e]' };
}

/**
 * Calculate total salary for a contract
 * @param {Object} contract - Contract object
 * @returns {number} - Total salary
 */
export function calculateTotalSalary(contract) {
  return (
    (contract.basicSalary || 0) +
    (contract.allowance || 0) +
    (contract.attendanceBonus || 0) +
    (contract.fullAttendanceBonus || 0) +
    (Number(contract.signingBonus) || 0)
  );
}

/**
 * Filter contracts based on search query
 * @param {Array} contracts - Array of contracts
 * @param {string} searchQuery - Search query string
 * @param {Function} formatDate - Date formatting function
 * @returns {Array} - Filtered contracts
 */
export function filterContracts(contracts, searchQuery, formatDate) {
  if (!searchQuery.trim()) return contracts;
  
  const query = searchQuery.toLowerCase();
  return contracts.filter((contract) => {
    return (
      contract.name?.toLowerCase().includes(query) ||
      contract.position?.toLowerCase().includes(query) ||
      contract.termMonths?.toString().includes(query) ||
      formatDate(contract.assessmentDate)?.toLowerCase().includes(query)
    );
  });
}
