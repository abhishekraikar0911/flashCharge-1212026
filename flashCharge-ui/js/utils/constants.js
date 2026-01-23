export const BATTERY = {
  NOMINAL_VOLTAGE: 73.6,
  FULL_SOC: 90,
  RANGE_PER_AH: 2.8
};

export const PRICING = {
  PER_KWH: 2.88,
  SYMBOL: '₹'
};

export const CHARGING_MODES = {
  RANGE: 'range',
  TIME: 'time',
  AMOUNT: 'amount',
  FULL: 'full'
};

export const SLIDER_CONFIG = {
  RANGE: {
    min: 10,
    max: null, // Set dynamically
    step: 5,
    unit: 'km'
  },
  TIME: {
    min: 5,
    max: 120,
    step: 5,
    unit: 'min'
  },
  AMOUNT: {
    min: 5,
    max: 50,
    step: 1,
    unit: '₹'
  }
};

export const API_ENDPOINTS = {
  BASE: '/api',
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me'
  },
  CHARGERS: {
    LIST: '/api/chargers/list',
    CONNECTORS: (id) => `/api/chargers/${id}/connectors`,
    CHARGING_PARAMS: (id) => `/api/chargers/${id}/charging-params`,
    START: (id) => `/api/chargers/${id}/start`,
    STOP: (id) => `/api/chargers/${id}/stop`,
    SOC: (id) => `/api/chargers/${id}/soc`,
    HEALTH: (id) => `/api/chargers/${id}/health`
  }
};

export const ROUTES = {
  LOGIN: '/login.html',
  SELECT_CHARGER: '/select-charger.html',
  CONFIGURE: '/configure-charge.html',
  DASHBOARD: '/index.html'
};
