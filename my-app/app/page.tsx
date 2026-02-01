'use client';

import { useState, useEffect, useMemo } from 'react';
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
    // Extract base path from the current URL
    const pathParts = window.location.pathname.split('/');
    // If we're on GitHub Pages with a repo name (e.g., /aws/)
    if (pathParts.length > 1 && pathParts[1]) {
      return `/${pathParts[1]}`;
    }
  }
  return '';
};

export default function Home() {
  const [data, setData] = useState<IAMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    service: 'All',
    accessLevel: 'All',
    hasRequestTag: null,
    hasResourceTag: null,
    hasTagKeys: null,
    supportsResourceLevel: null,
  });

  useEffect(() => {
    const basePath = getBasePath();
    const dataUrl = `${basePath}/aws-iam-consolidated.json`.replace(/\/+/g, '/');
    
    console.log('Fetching data from:', dataUrl);
    
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

  const allActions: ActionWithService[] = useMemo(() => {
    if (!data) return [];
    
    const actions: ActionWithService[] = [];
    for (const service of data.services) {
      for (const action of service.actions) {
        actions.push({ action, service });
      }
    }
    return actions;
  }, [data]);

  const filteredActions = useMemo(() => {
    return allActions.filter(({ action, service }) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const actionName = `${service.service}:${action.name}`.toLowerCase();
        if (!actionName.includes(searchLower)) {
          return false;
        }
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

      return true;
    });
  }, [allActions, filters]);

  const serviceNames = useMemo(() => {
    if (!data) return [];
    return data.services.map((s) => s.service).sort();
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const totalActions = allActions.length;
    const actionsWithRequestTag = allActions.filter(({ action }) => action.hasRequestTag).length;
    const actionsWithResourceTag = allActions.filter(({ action }) => action.hasResourceTag).length;
    const actionsWithTagKeys = allActions.filter(({ action }) => action.hasTagKeys).length;
    const actionsWithResourceLevel = allActions.filter(({ action }) => action.supportsResourceLevelPermissions).length;

    return {
      totalActions,
      actionsWithRequestTag,
      actionsWithResourceTag,
      actionsWithTagKeys,
      actionsWithResourceLevel,
    };
  }, [allActions, data]);

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
                onFilterChange={setFilters}
                services={serviceNames}
                totalResults={filteredActions.length}
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
              <div className="space-y-4">
                {filteredActions.map(({ action, service }) => (
                  <ActionCard
                    key={`${service.service}:${action.name}`}
                    action={action}
                    service={service}
                  />
                ))}
              </div>
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
