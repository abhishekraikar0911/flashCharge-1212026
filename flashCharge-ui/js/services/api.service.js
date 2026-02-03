import { API_ENDPOINTS, ROUTES } from '../utils/constants.js';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function handleAuthError(response) {
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('authToken');
    window.location.replace(ROUTES.LOGIN);
    return true;
  }
  return false;
}

export async function login(username, password) {
  const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return response.json();
}

export async function getChargerList() {
  const response = await fetch(API_ENDPOINTS.CHARGERS.LIST, {
    headers: getAuthHeaders()
  });
  if (handleAuthError(response)) return null;
  return response.json();
}

export async function getConnectors(chargerId) {
  const response = await fetch(API_ENDPOINTS.CHARGERS.CONNECTORS(chargerId), {
    headers: getAuthHeaders()
  });
  if (handleAuthError(response)) return null;
  return response.json();
}

export async function getChargingParams(chargerId) {
  const response = await fetch(API_ENDPOINTS.CHARGERS.CHARGING_PARAMS(chargerId), {
    headers: getAuthHeaders()
  });
  if (handleAuthError(response)) return null;
  return response.json();
}

export async function startCharging(chargerId, connectorId, idTag = 'TEST_TAG') {
  const response = await fetch(API_ENDPOINTS.CHARGERS.START(chargerId), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ connectorId, idTag })
  });
  if (handleAuthError(response)) return null;
  return { ok: response.ok, data: await response.json() };
}

export async function stopCharging(chargerId) {
  const response = await fetch(API_ENDPOINTS.CHARGERS.STOP(chargerId), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({})
  });
  if (handleAuthError(response)) return null;
  return { ok: response.ok, data: await response.json() };
}

export async function getSOC(chargerId) {
  const response = await fetch(API_ENDPOINTS.CHARGERS.SOC(chargerId));
  return response.json();
}

export async function getHealth(chargerId) {
  const response = await fetch(API_ENDPOINTS.CHARGERS.HEALTH(chargerId));
  return response.json();
}

export async function getConnectorStatus(chargerId, connectorId) {
  const response = await fetch(`${API_ENDPOINTS.CHARGERS.CONNECTORS(chargerId)}/${connectorId}`);
  return response.json();
}
