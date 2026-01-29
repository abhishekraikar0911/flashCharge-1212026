const API = "/api";
const urlParams = new URLSearchParams(window.location.search);
const chargerId = urlParams.get('charger');
const connectorId = parseInt(urlParams.get('connector'));

let params = null;
let currentMode = 'range';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function loadParams() {
  try {
    const res = await fetch(`${API}/chargers/${chargerId}/charging-params`, {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('authToken');
      window.location.replace('/login.html');
      return;
    }
    
    params = await res.json();
    
    document.getElementById('charger-info').innerText = 
      `${chargerId} • Connector ${connectorId} • NX-100 ${params.variant} • ${params.currentSOC.toFixed(1)}% • ${params.currentRangeKm.toFixed(0)} km`;
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('config-ui').style.display = 'block';
    
    setupMode('range');
  } catch (error) {
    console.error('Load params error:', error);
    showToast('Failed to load battery parameters', 'error');
  }
}

function calculateFromRange(targetKm) {
  const rangeToAdd = targetKm - params.currentRangeKm;
  if (rangeToAdd <= 0) return null;
  
  const ahNeeded = rangeToAdd / 2.8;
  const finalAh = Math.min(params.currentAh + ahNeeded, params.maxCapacityAh * 0.9);
  const actualAhNeeded = finalAh - params.currentAh;
  
  const finalSOC = (finalAh / params.maxCapacityAh) * 100;
  const energykWh = (actualAhNeeded * 73.6) / 1000;
  const timeMin = (actualAhNeeded / params.chargingCurrent) * 60;
  const cost = energykWh * 15.00;
  
  return { energykWh, timeMin, finalSOC, finalRange: params.currentRangeKm + (actualAhNeeded * 2.8), cost };
}

function calculateFromTime(targetMin) {
  const ahDelivered = (params.chargingCurrent * targetMin) / 60;
  const finalAh = Math.min(params.currentAh + ahDelivered, params.maxCapacityAh * 0.9);
  const actualAhDelivered = finalAh - params.currentAh;
  
  const finalSOC = (finalAh / params.maxCapacityAh) * 100;
  const rangeAdded = actualAhDelivered * 2.8;
  const finalRange = params.currentRangeKm + rangeAdded;
  const energykWh = (actualAhDelivered * 73.6) / 1000;
  const cost = energykWh * 15.00;
  
  return { energykWh, timeMin: targetMin, finalSOC, finalRange, cost };
}

function calculateFromAmount(targetRupees) {
  const energykWh = targetRupees / 15.00;
  const ahDelivered = (energykWh * 1000) / 73.6;
  const finalAh = Math.min(params.currentAh + ahDelivered, params.maxCapacityAh * 0.9);
  const actualAhDelivered = finalAh - params.currentAh;
  
  const finalSOC = (finalAh / params.maxCapacityAh) * 100;
  const rangeAdded = actualAhDelivered * 2.8;
  const finalRange = params.currentRangeKm + rangeAdded;
  const actualEnergy = (actualAhDelivered * 73.6) / 1000;
  const actualCost = actualEnergy * 15.00;
  const timeMin = (actualAhDelivered / params.chargingCurrent) * 60;
  
  return { energykWh: actualEnergy, timeMin, finalSOC, finalRange, cost: actualCost };
}

function calculateFull() {
  const targetAh = params.maxCapacityAh * 0.9;
  const ahNeeded = targetAh - params.currentAh;
  
  if (ahNeeded <= 0) {
    return { alreadyFull: true };
  }
  
  const finalSOC = 90;
  const rangeAdded = ahNeeded * 2.8;
  const finalRange = params.currentRangeKm + rangeAdded;
  const energykWh = (ahNeeded * 73.6) / 1000;
  const timeMin = (ahNeeded / params.chargingCurrent) * 60;
  const cost = energykWh * 15.00;
  
  return { energykWh, timeMin, finalSOC, finalRange, cost };
}

function updatePredictions(value) {
  let result;
  
  if (currentMode === 'range') {
    result = calculateFromRange(value);
  } else if (currentMode === 'time') {
    result = calculateFromTime(value);
  } else if (currentMode === 'amount') {
    result = calculateFromAmount(value);
  } else if (currentMode === 'full') {
    result = calculateFull();
  }
  
  if (!result) return;
  
  if (result.alreadyFull) {
    document.getElementById('pred-energy').innerText = '--';
    document.getElementById('pred-time').innerText = 'Already FULL';
    document.getElementById('pred-soc').innerText = '90%';
    document.getElementById('pred-range').innerText = params.maxRangeKm + ' km';
    document.getElementById('pred-cost').innerText = '₹0.00';
    document.getElementById('start-btn').disabled = true;
    return;
  }
  
  document.getElementById('pred-energy').innerText = result.energykWh.toFixed(2) + ' kWh';
  document.getElementById('pred-time').innerText = '~' + Math.round(result.timeMin) + ' min';
  document.getElementById('pred-soc').innerText = result.finalSOC.toFixed(0) + '%';
  document.getElementById('pred-range').innerText = result.finalRange.toFixed(0) + ' km';
  document.getElementById('pred-cost').innerText = '₹' + result.cost.toFixed(2);
  document.getElementById('start-btn').disabled = false;
}

function setupMode(mode) {
  currentMode = mode;
  const slider = document.getElementById('slider');
  const sliderContainer = document.getElementById('slider-container');
  const inputLabel = document.getElementById('input-label');
  const inputDisplay = document.getElementById('input-display');
  
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  
  if (mode === 'range') {
    sliderContainer.style.display = 'block';
    const min = Math.ceil(params.currentRangeKm + 10);
    const max = params.maxRangeKm;
    const defaultVal = Math.min(params.currentRangeKm + 50, max);
    
    slider.min = min;
    slider.max = max;
    slider.value = defaultVal;
    slider.step = 5;
    
    document.getElementById('slider-min').innerText = min + ' km';
    document.getElementById('slider-max').innerText = max + ' km';
    
    slider.oninput = () => {
      inputDisplay.innerText = slider.value + ' km';
      updatePredictions(parseInt(slider.value));
    };
    
    inputLabel.innerHTML = 'Target Range: <span id="input-display">' + defaultVal + ' km</span>';
    updatePredictions(defaultVal);
    
  } else if (mode === 'time') {
    sliderContainer.style.display = 'block';
    slider.min = 5;
    slider.max = 120;
    slider.value = 30;
    slider.step = 5;
    
    document.getElementById('slider-min').innerText = '5 min';
    document.getElementById('slider-max').innerText = '120 min';
    
    slider.oninput = () => {
      inputDisplay.innerText = slider.value + ' min';
      updatePredictions(parseInt(slider.value));
    };
    
    inputLabel.innerHTML = 'Charge Time: <span id="input-display">30 min</span>';
    updatePredictions(30);
    
  } else if (mode === 'amount') {
    sliderContainer.style.display = 'block';
    slider.min = 5;
    slider.max = 50;
    slider.value = 20;
    slider.step = 1;
    
    document.getElementById('slider-min').innerText = '₹5';
    document.getElementById('slider-max').innerText = '₹50';
    
    slider.oninput = () => {
      inputDisplay.innerText = '₹' + slider.value;
      updatePredictions(parseInt(slider.value));
    };
    
    inputLabel.innerHTML = 'Charge Amount: <span id="input-display">₹20</span>';
    updatePredictions(20);
    
  } else if (mode === 'full') {
    sliderContainer.style.display = 'none';
    inputLabel.innerHTML = 'Charge to FULL (90% SOC)';
    updatePredictions(null);
  }
}

document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.onclick = () => setupMode(tab.dataset.mode);
});

document.getElementById('start-btn').onclick = async () => {
  const btn = document.getElementById('start-btn');
  btn.disabled = true;
  btn.innerText = '⏳ STARTING...';
  
  try {
    const response = await fetch(`${API}/chargers/${chargerId}/start`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        connectorId: connectorId,
        idTag: 'TEST_TAG'
      })
    });
    
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken');
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => window.location.replace('/login.html'), 1500);
      return;
    }
    
    if (response.ok) {
      showToast('Charging started!', 'success');
      setTimeout(() => {
        window.location.href = `/?charger=${chargerId}&connector=${connectorId}`;
      }, 1000);
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to start charging', 'error');
      btn.disabled = false;
      btn.innerText = '🚀 START CHARGING';
    }
  } catch (error) {
    console.error('Start error:', error);
    showToast('Connection error', 'error');
    btn.disabled = false;
    btn.innerText = '🚀 START CHARGING';
  }
};

document.getElementById('back-btn').onclick = () => {
  window.location.href = '/select-charger.html';
};

document.getElementById('logout-btn').onclick = () => {
  localStorage.removeItem('authToken');
  window.location.replace('/login.html');
};

window.onload = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.replace('/login.html');
    return;
  }
  
  if (!chargerId || !connectorId) {
    showToast('Invalid parameters', 'error');
    setTimeout(() => window.location.href = '/select-charger.html', 1500);
    return;
  }
  
  loadParams();
};
