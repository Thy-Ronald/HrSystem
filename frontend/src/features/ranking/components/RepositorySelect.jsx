/**
 * RepositorySelect Component
 * Searchable dropdown for repository selection
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export function RepositorySelect({ repositories, selectedRepo, onRepoChange, loading }) {
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

  const handleSelect = (repoFullName) => {
    onRepoChange(repoFullName);
    setSearch('');
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  // Get display value
  const displayValue = isOpen ? search : selectedRepo;

  return (
    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
      <label htmlFor="repo-search" className="text-sm font-medium text-[#5f6368] whitespace-nowrap">
        Repository
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="repo-search"
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={loading ? 'Loading...' : 'Search repositories...'}
          disabled={loading}
          className="px-3 py-1.5 pr-8 text-sm border border-[#dadce0] rounded bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] min-w-[280px] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
      </div>

      {isOpen && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadce0] rounded shadow-lg z-50 max-h-64 overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#70757a]">
              {repositories.length === 0 ? 'No repositories found' : 'No matching repositories'}
            </div>
          ) : (
            filteredRepos.map((repo) => (
              <button
                key={repo.fullName}
                type="button"
                onClick={() => handleSelect(repo.fullName)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#f1f3f4] ${selectedRepo === repo.fullName ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-[#202124]'
                  }`}
              >
                {repo.fullName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
