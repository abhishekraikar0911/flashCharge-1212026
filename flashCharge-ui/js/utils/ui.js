export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    chargerId: urlParams.get('charger'),
    connectorId: parseInt(urlParams.get('connector'))
  };
}

export function setButtonLoading(button, isLoading, loadingText = '⏳ LOADING...') {
  if (isLoading) {
    button.dataset.originalText = button.innerText;
    button.classList.add('loading');
    button.innerText = loadingText;
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.innerText = button.dataset.originalText || button.innerText;
    button.disabled = false;
  }
}

export function updateGauge(soc) {
  const ring = document.getElementById('soc-ring');
  const socValueEl = document.getElementById('soc-value');
  
  if (!ring || !socValueEl) return;

  const circumference = 534;
  const value = Math.max(0, Math.min(100, soc));
  const offset = circumference - (value / 100) * circumference;

  ring.style.strokeDashoffset = offset;
  socValueEl.innerText = value ? parseFloat(value).toFixed(1) : '--';
  ring.style.filter = `drop-shadow(0 0 ${10 + value / 4}px rgba(59,130,246,0.9))`;
}

export function formatCost(cost) {
  return `₹${cost.toFixed(2)}`;
}

export function formatTime(minutes) {
  return `~${Math.round(minutes)} min`;
}

export function formatEnergy(kWh) {
  return `${kWh.toFixed(2)} kWh`;
}

export function formatSOC(soc) {
  return `${soc.toFixed(0)}%`;
}

export function formatRange(km) {
  return `${km.toFixed(0)} km`;
}
