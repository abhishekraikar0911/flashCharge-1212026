const API = "/api";
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const urlParams = new URLSearchParams(window.location.search);
const chargerId = urlParams.get('charger') || "RIVOT_100A_01";
const connectorId = parseInt(urlParams.get('connector')) || 1;

const PRICE_PER_KWH = 15.00;
const CHARGING_POWER_KW = 3.0;

let ws = null;

function connectWebSocket() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  
  ws = new WebSocket(`${WS_URL}?charger=${chargerId}&token=${token}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'update') {
      vehicleData.currentSoc = data.soc || vehicleData.currentSoc;
      vehicleData.model = data.model || vehicleData.model;
      vehicleData.currentRange = data.range || vehicleData.currentRange;
      vehicleData.temperature = data.temperature;
      updateVehicleInfo();
      updateSummary();
    }
  };
  
  ws.onclose = (event) => {
    if (event.code === 4001 || event.code === 4002) {
      localStorage.removeItem('authToken');
      window.location.replace('/login.html');
      return;
    }
    setTimeout(connectWebSocket, 3000);
  };
}

let vehicleData = {
  model: "NX-100 PRO",
  currentSoc: 44,
  maxSoc: 100,
  currentRange: 74,
  maxRange: 168,
  batteryCapacityKwh: 4.32,
  maxCurrentA: 35,
  temperature: null
};

let currentMode = 'soc';
let currentConfig = {
  targetSoc: 80,
  targetRange: 135,
  cost: 13,
  time: 26
};

let refreshInterval = null;
let isUpdating = false;

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

async function fetchVehicleData() {
  if (isUpdating) return;
  isUpdating = true;
  
  try {
    const res = await fetch(`${API}/chargers/${chargerId}/soc`);
    const data = await res.json();
    
    console.log('Fetched vehicle data:', data);
    
    const newSoc = data.soc || vehicleData.currentSoc;
    const newModel = data.model || vehicleData.model;
    const newRange = parseFloat(data.currentRangeKm) || vehicleData.currentRange;
    const newMaxRange = parseFloat(data.maxRangeKm) || vehicleData.maxRange;
    const newTemp = data.temperature || null;
    
    // Only update if values changed
    const hasChanges = 
      newSoc !== vehicleData.currentSoc ||
      newModel !== vehicleData.model ||
      newRange !== vehicleData.currentRange ||
      newMaxRange !== vehicleData.maxRange ||
      newTemp !== vehicleData.temperature;
    
    if (hasChanges) {
      vehicleData.currentSoc = newSoc;
      vehicleData.model = newModel;
      vehicleData.currentRange = newRange;
      vehicleData.maxRange = newMaxRange;
      vehicleData.temperature = newTemp;
      
      if (data.model.includes("Classic")) {
        vehicleData.batteryCapacityKwh = 2.16;
        vehicleData.maxCurrentA = 30;
      } else if (data.model.includes("Pro")) {
        vehicleData.batteryCapacityKwh = 4.32;
        vehicleData.maxCurrentA = 35;
      } else if (data.model.includes("Max")) {
        vehicleData.batteryCapacityKwh = 6.48;
        vehicleData.maxCurrentA = 100;
      }
      
      console.log('Updated vehicleData:', vehicleData);
      
      updateVehicleInfo();
      updateSummary();
    }
  } catch (error) {
    console.error("Failed to fetch vehicle data:", error);
  } finally {
    isUpdating = false;
  }
}

function updateVehicleInfo() {
  let modelShort = vehicleData.model;
  if (modelShort.includes('NX-100')) {
    modelShort = modelShort.replace('NX-100 ', '');
  } else if (modelShort === '--') {
    modelShort = 'PRO';
  }
  
  const modelEl = document.getElementById('vehicle-model');
  const socEl = document.getElementById('current-soc');
  const rangeEl = document.getElementById('current-range');
  const chargerEl = document.getElementById('charger-display');
  
  const newSocText = `${Math.round(vehicleData.currentSoc)}%`;
  const newRangeText = `${Math.round(vehicleData.currentRange)} km`;
  
  if (modelEl && modelEl.innerText !== modelShort) modelEl.innerText = modelShort;
  if (socEl && socEl.innerText !== newSocText) socEl.innerText = newSocText;
  if (rangeEl && rangeEl.innerText !== newRangeText) rangeEl.innerText = newRangeText;
  if (chargerEl && chargerEl.innerText !== chargerId) chargerEl.innerText = chargerId;
}

function initializeSlider() {
  switchMode('soc');
}

function switchMode(mode) {
  currentMode = mode;
  
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    }
  });
  
  // Calculate maximum values consistently
  const socDiffMax = vehicleData.maxSoc - vehicleData.currentSoc;
  const maxEnergyKwh = (vehicleData.batteryCapacityKwh * socDiffMax) / 100;
  const chargingPowerKW = Math.min(CHARGING_POWER_KW, (vehicleData.maxCurrentA * 72) / 1000);
  const maxTimeMinutes = Math.ceil((maxEnergyKwh / chargingPowerKW) * 60);
  const maxCost = Math.ceil(maxEnergyKwh * PRICE_PER_KWH);
  
  let values = [];
  let defaultValue;
  
  switch(mode) {
    case 'soc':
      for (let i = Math.ceil(vehicleData.currentSoc); i <= vehicleData.maxSoc; i++) {
        values.push({ value: i, label: `${i}%` });
      }
      defaultValue = Math.min(80, vehicleData.maxSoc);
      break;
      
    case 'range':
      for (let i = Math.ceil(vehicleData.currentRange); i <= vehicleData.maxRange; i += 2) {
        values.push({ value: i, label: `${i}km` });
      }
      defaultValue = Math.min(currentConfig.targetRange, vehicleData.maxRange);
      break;
      
    case 'amount':
      for (let i = 1; i <= maxCost; i++) {
        values.push({ value: i, label: `₹${i}` });
      }
      defaultValue = Math.min(currentConfig.cost, maxCost);
      break;
      
    case 'time':
      for (let i = 1; i <= maxTimeMinutes; i++) {
        values.push({ value: i, label: `${i}m` });
      }
      defaultValue = Math.min(currentConfig.time, maxTimeMinutes);
      break;
  }
  
  console.log(`Mode: ${mode}, Max values: energy=${maxEnergyKwh.toFixed(2)}kWh, cost=₹${maxCost}, time=${maxTimeMinutes}min`);
  
  populatePicker(values, defaultValue);
}

function populatePicker(values, defaultValue) {
  const pickerScroll = document.getElementById('picker-scroll');
  pickerScroll.innerHTML = '';
  
  values.forEach(item => {
    const div = document.createElement('div');
    div.className = 'picker-item';
    div.dataset.value = item.value;
    div.innerText = item.label;
    pickerScroll.appendChild(div);
  });
  
  const defaultIndex = values.findIndex(v => v.value >= defaultValue);
  const scrollToIndex = defaultIndex >= 0 ? defaultIndex : Math.floor(values.length / 2);
  
  setTimeout(() => {
    const itemWidth = 76;
    pickerScroll.scrollLeft = scrollToIndex * itemWidth;
    updatePickerSelection();
  }, 50);
  
  pickerScroll.removeEventListener('scroll', handlePickerScroll);
  pickerScroll.addEventListener('scroll', handlePickerScroll);
  
  pickerScroll.querySelectorAll('.picker-item').forEach(item => {
    item.onclick = () => {
      const index = Array.from(pickerScroll.children).indexOf(item);
      pickerScroll.scrollTo({
        left: index * 76,
        behavior: 'smooth'
      });
    };
  });
}

let scrollTimeout;
function handlePickerScroll() {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    snapToNearest();
    updatePickerSelection();
  }, 100);
}

function snapToNearest() {
  const pickerScroll = document.getElementById('picker-scroll');
  const itemWidth = 76;
  const scrollLeft = pickerScroll.scrollLeft;
  const nearestIndex = Math.round(scrollLeft / itemWidth);
  
  pickerScroll.scrollTo({
    left: nearestIndex * itemWidth,
    behavior: 'smooth'
  });
}

function updatePickerSelection() {
  const pickerScroll = document.getElementById('picker-scroll');
  const itemWidth = 76;
  const scrollLeft = pickerScroll.scrollLeft;
  const centerIndex = Math.round(scrollLeft / itemWidth);
  
  const items = pickerScroll.querySelectorAll('.picker-item');
  items.forEach((item, index) => {
    if (index === centerIndex) {
      item.classList.add('active');
      const value = parseInt(item.dataset.value);
      updateFromPickerValue(value);
    } else {
      item.classList.remove('active');
    }
  });
}

function updateFromPickerValue(value) {
  let targetSoc, targetRange, energyKwh, cost, timeMinutes;
  
  // Calculate based on the selected mode
  switch(currentMode) {
    case 'soc':
      targetSoc = value;
      break;
      
    case 'range':
      targetRange = value;
      targetSoc = (targetRange / vehicleData.maxRange) * 100;
      break;
      
    case 'amount':
      cost = value;
      energyKwh = cost / PRICE_PER_KWH;
      const socIncrease = (energyKwh / vehicleData.batteryCapacityKwh) * 100;
      targetSoc = Math.min(vehicleData.currentSoc + socIncrease, 100);
      break;
      
    case 'time':
      timeMinutes = value;
      const chargingPowerKW = Math.min(CHARGING_POWER_KW, (vehicleData.maxCurrentA * 72) / 1000);
      energyKwh = (chargingPowerKW * timeMinutes) / 60;
      const socInc = (energyKwh / vehicleData.batteryCapacityKwh) * 100;
      targetSoc = Math.min(vehicleData.currentSoc + socInc, 100);
      break;
  }
  
  // Now calculate all other values based on targetSoc
  if (!targetRange) {
    targetRange = (targetSoc / 100) * vehicleData.maxRange;
  }
  
  // Calculate energy needed based on SOC difference
  const socDiff = targetSoc - vehicleData.currentSoc;
  if (!energyKwh) {
    energyKwh = (vehicleData.batteryCapacityKwh * socDiff) / 100;
  }
  
  // Calculate cost based on energy
  if (!cost) {
    cost = energyKwh * PRICE_PER_KWH;
  }
  
  // Calculate time based on energy and power
  if (!timeMinutes) {
    const chargingPowerKW = Math.min(CHARGING_POWER_KW, (vehicleData.maxCurrentA * 72) / 1000);
    timeMinutes = (energyKwh / chargingPowerKW) * 60;
  }
  
  console.log('Unified calculation:', {
    mode: currentMode,
    pickerValue: value,
    targetSoc: targetSoc.toFixed(1),
    targetRange: targetRange.toFixed(1),
    energyKwh: energyKwh.toFixed(2),
    cost: cost.toFixed(0),
    timeMinutes: timeMinutes.toFixed(0)
  });
  
  currentConfig = {
    targetSoc: Math.round(targetSoc),
    targetRange: Math.round(targetRange),
    energyKwh: energyKwh,
    cost: Math.round(cost),
    time: Math.round(timeMinutes)
  };
  
  updateSummary();
}

function updateSlider() {
  // Deprecated - using picker now
}

function updateSliderGradient(slider) {
  // Deprecated - using picker now
}

function updateSummary() {
  const batteryEl = document.getElementById('summary-battery');
  const rangeEl = document.getElementById('summary-range');
  const timeEl = document.getElementById('summary-time');
  const energyEl = document.getElementById('summary-energy');
  const costEl = document.getElementById('summary-cost');
  const payAmountEl = document.getElementById('pay-amount');
  
  const batteryText = `${Math.round(vehicleData.currentSoc)}% → ${currentConfig.targetSoc}%`;
  const rangeText = `${Math.round(vehicleData.currentRange)} → ${currentConfig.targetRange}km`;
  const timeText = formatTime(currentConfig.time || 0);
  const energyText = `${(currentConfig.energyKwh || 0).toFixed(2)} kWh`;
  const costText = `₹${currentConfig.cost || 0}`;
  const costStr = (currentConfig.cost || 0).toString();
  
  if (batteryEl && batteryEl.innerText !== batteryText) batteryEl.innerText = batteryText;
  if (rangeEl && rangeEl.innerText !== rangeText) rangeEl.innerText = rangeText;
  if (timeEl && timeEl.innerText !== timeText) timeEl.innerText = timeText;
  if (energyEl && energyEl.innerText !== energyText) energyEl.innerText = energyText;
  if (costEl && costEl.innerText !== costText) costEl.innerText = costText;
  if (payAmountEl && payAmountEl.innerText !== costStr) payAmountEl.innerText = costStr;
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
}

function handlePayment() {
  const btn = document.getElementById('pay-start-btn');
  const originalText = btn.innerHTML;
  
  btn.classList.add('loading');
  btn.innerHTML = '⏳ PROCESSING PAYMENT...';
  
  setTimeout(() => {
    btn.innerHTML = '⏳ STARTING SESSION...';
    startCharging();
  }, 1500);
}

async function startCharging() {
  const btn = document.getElementById('pay-start-btn');
  
  try {
    const response = await fetch(`${API}/chargers/${chargerId}/start`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        connectorId: connectorId,
        idTag: "TEST_TAG",
        chargingMode: currentMode,
        targetSoc: currentConfig.targetSoc,
        targetAmount: currentConfig.cost,
        targetTime: currentConfig.time
      })
    });
    
    const data = await response.json();
    
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken');
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => window.location.replace('/login.html'), 1500);
      return;
    }
    
    if (response.ok) {
      const chargingTargets = {
        mode: currentMode,
        targetSoc: currentConfig.targetSoc,
        targetRange: currentConfig.targetRange,
        targetAmount: currentConfig.cost,
        targetTime: currentConfig.time,
        startTime: Date.now(),
        startSoc: vehicleData.currentSoc,
        startRange: vehicleData.currentRange,
        paidAmount: currentConfig.cost
      };
      localStorage.setItem(`charging_targets_${chargerId}`, JSON.stringify(chargingTargets));
      console.log('Saved charging targets:', chargingTargets);
      
      showToast('Charging started successfully!', 'success');
      setTimeout(() => {
        window.location.href = `/index.html?charger=${chargerId}&connector=${connectorId}`;
      }, 1500);
    } else {
      btn.classList.remove('loading');
      btn.innerHTML = '💳 PAY ₹<span id="pay-amount">' + currentConfig.cost + '</span> & START';
      showToast(data.error || 'Failed to start charging', 'error');
    }
  } catch (error) {
    console.error('Start error:', error);
    btn.classList.remove('loading');
    btn.innerHTML = '💳 PAY ₹<span id="pay-amount">' + currentConfig.cost + '</span> & START';
    showToast('Connection error', 'error');
  }
}

window.onload = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.replace('/login.html');
    return;
  }
  
  document.getElementById('back-btn').onclick = () => {
    window.location.href = '/select-charger.html';
  };
  
  document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('authToken');
    window.location.replace('/login.html');
  };
  
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.onclick = () => switchMode(btn.dataset.mode);
  });
  
  document.getElementById('pay-start-btn').onclick = handlePayment;
  
  connectWebSocket();
  
  // Initial fetch
  fetchVehicleData().then(() => {
    initializeSlider();
  });
  
  // Fallback polling every 30s
  refreshInterval = setInterval(fetchVehicleData, 30000);
};

// Cleanup on page unload
window.onbeforeunload = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
};
