const devDefault = typeof __DEV__ === 'boolean' ? __DEV__ : false;

export const SORT_DROPDOWN_ENABLED = true as const;
export const GEO_SORT_ENABLED = true as const;
export const AUTO_ARRIVE_ENABLED = true as const;

export const AI_NL_SEARCH_ENABLED: boolean = devDefault;
export const AI_RERANK_ENABLED: boolean = devDefault;
export const AI_COPILOT_CHIPS_ENABLED: boolean = devDefault;
