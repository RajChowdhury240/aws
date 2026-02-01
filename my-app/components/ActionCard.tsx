import { IAMAction, IAMService } from '@/types/iam';
import { ChevronDown, ChevronUp, Check, X, Tag, Layers, Shield, FileText, Link2 } from 'lucide-react';
import { useState } from 'react';

interface ActionCardProps {
  action: IAMAction;
  service: IAMService;
}

export function ActionCard({ action, service }: ActionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'List':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Read':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Write':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Tagging':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Permissions management':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatActionName = (name: string) => {
    return `${service.service}:${name}`;
  };

  // Safe accessors with defaults
  const dependentActions = action.dependentActions || [];
  const resources = action.resources || [];
  const conditionKeys = action.conditionKeys || [];
  const description = action.description || '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer flex items-start justify-between gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-base font-semibold text-gray-900 font-mono break-all">
              {formatActionName(action.name)}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getAccessLevelColor(action.accessLevel)}`}>
              {action.accessLevel}
            </span>
            {dependentActions.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full border border-orange-200 flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                {dependentActions.length} dependent
              </span>
            )}
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {description}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Layers className="w-4 h-4" />
              {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              {conditionKeys.length} condition key{conditionKeys.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tag Support Badges */}
          <div className="hidden sm:flex items-center gap-1">
            {action.hasRequestTag && (
              <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                RequestTag
              </span>
            )}
            {action.hasResourceTag && (
              <span className="px-2 py-1 text-xs bg-pink-50 text-pink-700 rounded border border-pink-100">
                ResourceTag
              </span>
            )}
            {action.hasTagKeys && (
              <span className="px-2 py-1 text-xs bg-teal-50 text-teal-700 rounded border border-teal-100">
                TagKeys
              </span>
            )}
          </div>

          <button className="p-1 hover:bg-gray-100 rounded">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Full Description */}
          {description && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description
              </h4>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {description}
              </p>
            </div>
          )}

          {/* Dependent Actions */}
          {dependentActions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Dependent Actions ({dependentActions.length})
              </h4>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <p className="text-xs text-orange-700 mb-2">
                  These additional permissions are required to successfully call this action:
                </p>
                <div className="flex flex-wrap gap-2">
                  {dependentActions.map((depAction) => (
                    <code 
                      key={depAction}
                      className="text-xs px-2 py-1 rounded font-mono bg-white text-orange-800 border border-orange-200"
                    >
                      {depAction}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tag Support - Mobile View */}
          <div className="sm:hidden flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-gray-600">RequestTag:</span>
              {action.hasRequestTag ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-gray-600">ResourceTag:</span>
              {action.hasResourceTag ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-gray-600">TagKeys:</span>
              {action.hasTagKeys ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>

          {/* Resource-Level Permissions */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Resource-Level Permissions</span>
              {action.supportsResourceLevelPermissions ? (
                <span className="flex items-center gap-1 text-sm text-green-700">
                  <Check className="w-4 h-4" />
                  Supported
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-amber-700">
                  <X className="w-4 h-4" />
                  Not Supported (use "*")
                </span>
              )}
            </div>
          </div>

          {/* Supported Resources */}
          {action.supportsResourceLevelPermissions && resources.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Supported Resources
              </h4>
              <div className="space-y-2">
                {resources.map((resourceName) => {
                  const resource = service.resources.find(r => r.name === resourceName);
                  return (
                    <div key={resourceName} className="bg-gray-50 rounded-lg p-3">
                      <code className="text-sm font-semibold text-gray-900">{resourceName}</code>
                      {resource && resource.arnFormats && resource.arnFormats.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {resource.arnFormats.map((arn, idx) => (
                            <code key={idx} className="block text-xs text-gray-600 font-mono break-all bg-white px-2 py-1 rounded border">
                              {arn}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Condition Keys */}
          {conditionKeys.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Condition Keys ({conditionKeys.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {conditionKeys.map((key) => (
                  <code 
                    key={key}
                    className={`text-xs px-2 py-1 rounded font-mono break-all ${
                      key.includes('RequestTag') 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                        : key.includes('ResourceTag')
                        ? 'bg-pink-50 text-pink-700 border border-pink-100'
                        : key.includes('TagKeys')
                        ? 'bg-teal-50 text-teal-700 border border-teal-100'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                    title={service.conditionKeys.find(ck => ck.name === key)?.types.join(', ') || ''}
                  >
                    {key}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Action Properties */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Action Properties</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(action.properties || {}).map(([key, value]) => (
                <div 
                  key={key}
                  className={`px-3 py-2 rounded text-sm ${
                    value 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}
                >
                  <span className="font-medium">{key.replace('Is', '')}</span>
                  <span className="ml-1">{value ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
