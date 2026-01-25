/**
 * RepositoryMultiSelect Component
 * Multi-select dropdown with checkboxes for repository selection
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export function RepositoryMultiSelect({ 
  repositories, 
  selectedRepos, 
  onSelectionChange,
  loading 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  // Debounce search input (300ms delay)
  const debouncedSearch = useDebounce(search, 300);

  // Memoize filtered repositories
  const filteredRepos = useMemo(() => {
    if (!debouncedSearch.trim()) return repositories;
    const searchLower = debouncedSearch.toLowerCase();
    return repositories.filter((repo) =>
      repo.fullName.toLowerCase().includes(searchLower)
    );
  }, [repositories, debouncedSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (repoFullName) => {
    const newSelection = selectedRepos.includes(repoFullName)
      ? selectedRepos.filter(r => r !== repoFullName)
      : [...selectedRepos, repoFullName];
    onSelectionChange(newSelection);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  // Get display value
  const displayValue = selectedRepos.length === 0 
    ? 'Select repositories...' 
    : selectedRepos.length === 1 
    ? selectedRepos[0]
    : `${selectedRepos.length} repositories selected`;

  return (
    <div className="flex flex-col gap-1 relative w-full" ref={dropdownRef}>
      <label htmlFor="repo-multi-select" className="text-sm font-medium text-[#5f6368]">
        Repositories
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="repo-multi-select"
          type="text"
          value={isOpen ? search : ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={loading ? 'Loading...' : displayValue}
          disabled={loading}
          readOnly={!isOpen}
          className="w-full px-3 py-1.5 pr-8 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] disabled:opacity-50 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-[#5f6368]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
            </svg>
          )}
        </button>
      </div>
      
      {isOpen && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadce0] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#70757a]">
              {repositories.length === 0 ? 'No repositories found' : 'No matching repositories'}
            </div>
          ) : (
            filteredRepos.map((repo) => {
              const isSelected = selectedRepos.includes(repo.fullName);
              return (
                <label
                  key={repo.fullName}
                  className="flex items-center px-3 py-2 hover:bg-[#f1f3f4] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(repo.fullName)}
                    className="mr-2 h-4 w-4 text-[#1a73e8] focus:ring-[#1a73e8] border-[#dadce0] rounded"
                  />
                  <span className={`text-sm ${isSelected ? 'text-[#1967d2] font-medium' : 'text-[#202124]'}`}>
                    {repo.fullName}
                  </span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
