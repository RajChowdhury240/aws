'use client';

import { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { IAMData, IAMAction, IAMService, FilterState } from '@/types/iam';
import { FilterPanel } from '@/components/FilterPanel';
import { ActionCard } from '@/components/ActionCard';
import { Search, Database, RefreshCw, Shield } from 'lucide-react';

interface ActionWithService {
  action: IAMAction;
  service: IAMService;
}

// Get the base path for GitHub Pages
const getBasePath = () => {
  if (typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length > 1 && pathParts[1]) {
      return `/${pathParts[1]}`;
    }
  }
  return '';
};

// Precompute searchable strings for better performance
const precomputeSearchData = (allActions: ActionWithService[]) => {
  return allActions.map(({ action, service }) => ({
    action,
    service,
    searchString: `${service.service}:${action.name}`.toLowerCase(),
  }));
};

export default function Home() {
  const [data, setData] = useState<IAMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [displayedCount, setDisplayedCount] = useState(50); // Virtual scrolling - only show first 50
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    service: 'All',
    accessLevel: 'All',
    hasRequestTag: null,
    hasResourceTag: null,
    hasTagKeys: null,
    supportsResourceLevel: null,
    hasDependentActions: null,
  });

  // Load data on mount
  useEffect(() => {
    const basePath = getBasePath();
    const dataUrl = `${basePath}/aws-iam-consolidated.json`.replace(/\/+/g, '/');
    
    fetch(dataUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data: IAMData) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Precomputed action data for fast filtering
  const allActionsWithSearch = useMemo(() => {
    if (!data) return [];
    const actions: ActionWithService[] = [];
    for (const service of data.services) {
      for (const action of service.actions) {
        actions.push({ action, service });
      }
    }
    return precomputeSearchData(actions);
  }, [data]);

  // Optimized filter function
  const filteredActions = useMemo(() => {
    if (!data) return [];
    
    // Quick filter - check if any filters are active
    const hasNoFilters = 
      !filters.search &&
      filters.service === 'All' &&
      filters.accessLevel === 'All' &&
      filters.hasRequestTag === null &&
      filters.hasResourceTag === null &&
      filters.hasTagKeys === null &&
      filters.supportsResourceLevel === null &&
      filters.hasDependentActions === null;
    
    if (hasNoFilters) {
      return allActionsWithSearch;
    }
    
    const searchLower = filters.search.toLowerCase();
    
    return allActionsWithSearch.filter(({ action, service, searchString }) => {
      // Search filter - use precomputed string
      if (filters.search && !searchString.includes(searchLower)) {
        return false;
      }

      // Service filter
      if (filters.service !== 'All' && service.service !== filters.service) {
        return false;
      }

      // Access level filter
      if (filters.accessLevel !== 'All' && action.accessLevel !== filters.accessLevel) {
        return false;
      }

      // Tag filters
      if (filters.hasRequestTag !== null && action.hasRequestTag !== filters.hasRequestTag) {
        return false;
      }
      if (filters.hasResourceTag !== null && action.hasResourceTag !== filters.hasResourceTag) {
        return false;
      }
      if (filters.hasTagKeys !== null && action.hasTagKeys !== filters.hasTagKeys) {
        return false;
      }

      // Resource level permissions filter
      if (filters.supportsResourceLevel !== null && 
          action.supportsResourceLevelPermissions !== filters.supportsResourceLevel) {
        return false;
      }

      // Dependent actions filter
      if (filters.hasDependentActions !== null && 
          (action.dependentActions?.length > 0) !== filters.hasDependentActions) {
        return false;
      }

      return true;
    });
  }, [allActionsWithSearch, filters, data]);

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(50);
  }, [filters]);

  // Load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        setDisplayedCount(prev => Math.min(prev + 50, filteredActions.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredActions.length]);

  // Wrap filter changes in startTransition for smooth UI
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    startTransition(() => {
      setFilters(newFilters);
    });
  }, []);

  const serviceNames = useMemo(() => {
    if (!data) return [];
    return data.services.map((s) => s.service).sort();
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const totalActions = allActionsWithSearch.length;
    const actionsWithRequestTag = allActionsWithSearch.filter(({ action }) => action.hasRequestTag).length;
    const actionsWithResourceTag = allActionsWithSearch.filter(({ action }) => action.hasResourceTag).length;
    const actionsWithTagKeys = allActionsWithSearch.filter(({ action }) => action.hasTagKeys).length;
    const actionsWithResourceLevel = allActionsWithSearch.filter(({ action }) => action.supportsResourceLevelPermissions).length;

    return {
      totalActions,
      actionsWithRequestTag,
      actionsWithResourceTag,
      actionsWithTagKeys,
      actionsWithResourceLevel,
    };
  }, [allActionsWithSearch, data]);

  // Slice for virtual scrolling
  const visibleActions = filteredActions.slice(0, displayedCount);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading AWS IAM data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-8 h-8 text-blue-600" />
                AWS IAM Actions Reference
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Complete reference for {data?.totalServices} AWS services • Last updated: {data?.lastUpdated}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</div>
                <div className="text-xs text-blue-200">Total Actions</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data?.totalServices}</div>
                <div className="text-xs text-blue-200">Services</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.actionsWithRequestTag.toLocaleString()}</div>
                <div className="text-xs text-blue-200">With RequestTag</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.actionsWithResourceTag.toLocaleString()}</div>
                <div className="text-xs text-blue-200">With ResourceTag</div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="text-2xl font-bold">{stats.actionsWithResourceLevel.toLocaleString()}</div>
                <div className="text-xs text-blue-200">Resource-Level Perms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                services={serviceNames}
                totalResults={filteredActions.length}
                isPending={isPending}
              />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {filteredActions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No actions found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {visibleActions.length.toLocaleString()} of {filteredActions.length.toLocaleString()} actions
                    {displayedCount < filteredActions.length && ' (scroll to load more)'}
                  </p>
                  {isPending && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Filtering...
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {visibleActions.map(({ action, service }) => (
                    <ActionCard
                      key={`${service.service}:${action.name}`}
                      action={action}
                      service={service}
                    />
                  ))}
                </div>
                {displayedCount < filteredActions.length && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading more...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            Data sourced from{' '}
            <a 
              href="https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              AWS Service Authorization Reference
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
