export interface IAMAction {
  name: string;
  description?: string;
  accessLevel: string;
  conditionKeys: string[];
  resources: string[];
  dependentActions: string[];
  supportsResourceLevelPermissions: boolean;
  properties: {
    IsList?: boolean;
    IsRead?: boolean;
    IsWrite?: boolean;
    IsPermissionManagement?: boolean;
    IsTaggingOnly?: boolean;
  };
  hasRequestTag: boolean;
  hasResourceTag: boolean;
  hasTagKeys: boolean;
}

export interface IAMResource {
  name: string;
  arnFormats: string[];
}

export interface IAMConditionKey {
  name: string;
  types: string[];
}

export interface IAMService {
  service: string;
  name: string;
  actions: IAMAction[];
  resources: IAMResource[];
  conditionKeys: IAMConditionKey[];
}

export interface IAMData {
  services: IAMService[];
  totalServices: number;
  failedServices: string[];
  lastUpdated: string;
}

export interface FilterState {
  search: string;
  service: string;
  accessLevel: string;
  hasRequestTag: boolean | null;
  hasResourceTag: boolean | null;
  hasTagKeys: boolean | null;
  supportsResourceLevel: boolean | null;
  hasDependentActions: boolean | null;
}
