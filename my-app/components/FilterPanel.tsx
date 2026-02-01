import { FilterState } from '@/types/iam';
import { useState, useEffect, useCallback, useRef } from 'react';

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  services: string[];
  totalResults: number;
  isPending?: boolean;
}

export function FilterPanel({ filters, onFilterChange, services, totalResults, isPending }: FilterPanelProps) {
  const accessLevels = ['All', 'List', 'Read', 'Write', 'Tagging', 'Permissions management'];
  
  // Local state for search input (for instant UI feedback)
  const [localSearch, setLocalSearch] = useState(filters.search);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local search with filters when filters change externally
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  // Debounced search update
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced update
    searchTimeoutRef.current = setTimeout(() => {
      onFilterChange({ ...filters, search: value });
    }, 150); // 150ms debounce
  }, [filters, onFilterChange]);

  const clearFilters = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setLocalSearch('');
    onFilterChange({
      search: '',
      service: 'All',
      accessLevel: 'All',
      hasRequestTag: null,
      hasResourceTag: null,
      hasTagKeys: null,
      supportsResourceLevel: null,
      hasDependentActions: null,
    });
  }, [onFilterChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const hasActiveFilters = 
    filters.search || 
    filters.service !== 'All' || 
    filters.accessLevel !== 'All' ||
    filters.hasRequestTag !== null ||
    filters.hasResourceTag !== null ||
    filters.hasTagKeys !== null ||
    filters.supportsResourceLevel !== null ||
    filters.hasDependentActions !== null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Search Actions</label>
        <div className="relative">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by action name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {isPending && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Service Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Service</label>
        <select
          value={filters.service}
          onChange={(e) => updateFilter('service', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="All">All Services</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </div>

      {/* Access Level Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Access Level</label>
        <select
          value={filters.accessLevel}
          onChange={(e) => updateFilter('accessLevel', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {accessLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      {/* Tag Support Filters */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Tag Support</label>
        
        <div className="space-y-2">
          <label className="flex items-center justify-between text-sm text-gray-600 cursor-pointer">
            <span>RequestTag</span>
            <select
              value={filters.hasRequestTag === null ? 'any' : filters.hasRequestTag ? 'yes' : 'no'}
              onChange={(e) => updateFilter('hasRequestTag', e.target.value === 'any' ? null : e.target.value === 'yes')}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>

          <label className="flex items-center justify-between text-sm text-gray-600 cursor-pointer">
            <span>ResourceTag</span>
            <select
              value={filters.hasResourceTag === null ? 'any' : filters.hasResourceTag ? 'yes' : 'no'}
              onChange={(e) => updateFilter('hasResourceTag', e.target.value === 'any' ? null : e.target.value === 'yes')}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>

          <label className="flex items-center justify-between text-sm text-gray-600 cursor-pointer">
            <span>TagKeys</span>
            <select
              value={filters.hasTagKeys === null ? 'any' : filters.hasTagKeys ? 'yes' : 'no'}
              onChange={(e) => updateFilter('hasTagKeys', e.target.value === 'any' ? null : e.target.value === 'yes')}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
      </div>

      {/* Resource Level Permissions */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 cursor-pointer">
          <span>Resource-Level Permissions</span>
          <select
            value={filters.supportsResourceLevel === null ? 'any' : filters.supportsResourceLevel ? 'yes' : 'no'}
            onChange={(e) => updateFilter('supportsResourceLevel', e.target.value === 'any' ? null : e.target.value === 'yes')}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="any">Any</option>
            <option value="yes">Supported</option>
            <option value="no">Not Supported</option>
          </select>
        </label>
      </div>

      {/* Results Count */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{totalResults.toLocaleString()}</span> actions
        </p>
      </div>
    </div>
  );
}
