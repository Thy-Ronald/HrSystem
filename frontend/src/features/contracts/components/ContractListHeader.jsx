/**
 * Column headers for the contract list table
 */
export function ContractListHeader() {
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-[#dadce0] bg-[#f8f9fa] text-xs font-medium text-[#5f6368] uppercase tracking-wider">
      <div className="w-40">Name</div>
      <div className="w-36">Position</div>
      <div className="w-20">Term</div>
      <div className="w-24">Assessment</div>
      <div className="flex-1">Status</div>
      <div className="flex items-center gap-4 ml-auto">
        <div className="w-24 text-right">Salary</div>
        <div className="w-24 text-right">Expiration</div>
        <div className="w-20 text-center">Actions</div>
      </div>
    </div>
  );
}
