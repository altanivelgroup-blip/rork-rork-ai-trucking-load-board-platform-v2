export type ThemeColors = {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  error: string;
  dark: string;
  gray: string;
  lightGray: string;
  white: string;
  truck: string;
  boxTruck: string;
  cargoVan: string;
  trailer: string;
  carHauler: string;
  flatbed: string;
  enclosed: string;
  reefer: string;
  card: string;
  border: string;
  tabBar: string;
  backdrop: string;
};

export type Theme = {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
};

const base = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
} as const;

export const lightTheme: Theme = {
  ...base,
  colors: {
    primary: '#1e3a8a',
    secondary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    error: '#ef4444',
    dark: '#111827',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    white: '#ffffff',
    truck: '#8b5cf6',
    boxTruck: '#ec4899',
    cargoVan: '#06b6d4',
    trailer: '#f97316',
    carHauler: '#84cc16',
    flatbed: '#a855f7',
    enclosed: '#14b8a6',
    reefer: '#0ea5e9',
    card: '#ffffff',
    border: '#E5E7EB',
    tabBar: '#ffffff',
    backdrop: 'rgba(0,0,0,0.25)',
  },
};

export const darkTheme: Theme = {
  ...base,
  colors: {
    primary: '#60a5fa',
    secondary: '#93c5fd',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    error: '#f87171',
    dark: '#F9FAFB',
    gray: '#9CA3AF',
    lightGray: '#111827',
    white: '#0b0f1a',
    truck: '#a78bfa',
    boxTruck: '#f472b6',
    cargoVan: '#22d3ee',
    trailer: '#fb923c',
    carHauler: '#a3e635',
    flatbed: '#c084fc',
    enclosed: '#2dd4bf',
    reefer: '#38bdf8',
    card: '#0f172a',
    border: '#1f2937',
    tabBar: '#0b1220',
    backdrop: 'rgba(0,0,0,0.5)',
  },
};

export const theme: Theme = lightTheme;
