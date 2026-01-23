const API = "/api";
const urlParams = new URLSearchParams(window.location.search);
const chargerId = urlParams.get('charger') || "RIVOT_100A_01";
const connectorId = parseInt(urlParams.get('connector')) || 1;

const PRICE_PER_KWH = 10.00;
const CHARGING_POWER_KW = 3.0;

let vehicleData = {
  model: "NX-100 PRO",
  currentSoc: 44,
  maxSoc: 100,
  currentRange: 74,
  maxRange: 168,
  batteryCapacityKwh: 4.32,
  maxCurrentA: 35
};

let currentMode = 'soc';
let currentConfig = {
  targetSoc: 80,
  targetRange: 135,
  cost: 13,
  time: 26
};

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
  try {
    const res = await fetch(`${API}/chargers/${chargerId}/soc`);
    const data = await res.json();
    
    vehicleData.currentSoc = data.soc || 44;
    vehicleData.model = data.model || "NX-100 PRO";
    vehicleData.currentRange = parseFloat(data.currentRangeKm) || 74;
    vehicleData.maxRange = parseFloat(data.maxRangeKm) || 168;
    
    if (data.model.includes("CLASSIC")) {
      vehicleData.batteryCapacityKwh = 2.16;
      vehicleData.maxCurrentA = 30;
    } else if (data.model.includes("PRO")) {
      vehicleData.batteryCapacityKwh = 4.32;
      vehicleData.maxCurrentA = 35;
    } else if (data.model.includes("MAX")) {
      vehicleData.batteryCapacityKwh = 6.48;
      vehicleData.maxCurrentA = 100;
    }
    
    updateVehicleInfo();
    initializeSlider();
  } catch (error) {
    console.error("Failed to fetch vehicle data:", error);
    updateVehicleInfo();
    initializeSlider();
  }
}

function updateVehicleInfo() {
  let modelShort = vehicleData.model;
  if (modelShort.includes('NX-100')) {
    modelShort = modelShort.replace('NX-100 ', '');
  } else if (modelShort === '--') {
    modelShort = 'PRO';
  }
  document.getElementById('vehicle-model').innerText = modelShort;
  document.getElementById('current-soc').innerText = `${vehicleData.currentSoc}%`;
  document.getElementById('current-range').innerText = `${vehicleData.currentRange} km`;
  document.getElementById('charger-display').innerText = chargerId;
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
  
  const socDiffMax = vehicleData.maxSoc - vehicleData.currentSoc;
  const maxEnergy = (vehicleData.batteryCapacityKwh * socDiffMax) / 100;
  const maxCost = Math.ceil(maxEnergy * PRICE_PER_KWH);
  const chargingPowerKW = Math.min(CHARGING_POWER_KW, (vehicleData.maxCurrentA * 72) / 1000);
  const maxTime = Math.ceil((maxEnergy / chargingPowerKW) * 60);
  
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
      for (let i = 5; i <= maxCost; i += 5) {
        values.push({ value: i, label: `₹${i}` });
      }
      defaultValue = Math.min(currentConfig.cost, maxCost);
      break;
      
    case 'time':
      for (let i = 1; i <= maxTime; i += 2) {
        values.push({ value: i, label: `${i}m` });
      }
      defaultValue = Math.min(currentConfig.time, maxTime);
      break;
  }
  
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
  
  switch(currentMode) {
    case 'soc':
      targetSoc = value;
      targetRange = (targetSoc / 100) * vehicleData.maxRange;
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
      targetRange = (targetSoc / 100) * vehicleData.maxRange;
      break;
      
    case 'time':
      timeMinutes = value;
      energyKwh = (CHARGING_POWER_KW * timeMinutes) / 60;
      const socInc = (energyKwh / vehicleData.batteryCapacityKwh) * 100;
      targetSoc = Math.min(vehicleData.currentSoc + socInc, 100);
      targetRange = (targetSoc / 100) * vehicleData.maxRange;
      break;
  }
  
  const socDiff = targetSoc - vehicleData.currentSoc;
  energyKwh = (vehicleData.batteryCapacityKwh * socDiff) / 100;
  cost = energyKwh * PRICE_PER_KWH;
  
  const chargingPowerKW = Math.min(CHARGING_POWER_KW, (vehicleData.maxCurrentA * 72) / 1000);
  timeMinutes = (energyKwh / chargingPowerKW) * 60;
  
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
  document.getElementById('summary-battery').innerText = 
    `${vehicleData.currentSoc}% → ${currentConfig.targetSoc}%`;
  document.getElementById('summary-range').innerText = 
    `${vehicleData.currentRange} → ${currentConfig.targetRange}km`;
  document.getElementById('summary-time').innerText = formatTime(currentConfig.time);
  document.getElementById('summary-energy').innerText = `${currentConfig.energyKwh.toFixed(2)} kWh`;
  document.getElementById('summary-cost').innerText = `₹${currentConfig.cost}`;
  document.getElementById('pay-amount').innerText = currentConfig.cost;
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
  
  fetchVehicleData();
};
