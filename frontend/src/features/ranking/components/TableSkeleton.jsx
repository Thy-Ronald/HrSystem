/**
 * TableSkeleton Component
 * Loading skeleton for ranking table
 */

export function TableSkeleton() {
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
      <table className="w-full min-w-[800px] border-collapse">
        <thead>
          <tr className="border-b border-[#e8eaed]">
            {Array.from({ length: 8 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 bg-[#e8eaed] rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-[#e8eaed]">
              {Array.from({ length: 8 }).map((_, j) => (
                <td key={j} className="px-4 py-4">
                  <div className="h-4 bg-[#f1f3f4] rounded animate-pulse mx-auto" style={{ width: j === 0 ? '80px' : '40px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
