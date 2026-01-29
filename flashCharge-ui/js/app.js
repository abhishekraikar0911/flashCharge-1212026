const API = "/api";
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const urlParams = new URLSearchParams(window.location.search);
const chargerId = urlParams.get('charger') || "RIVOT_100A_01";
let selectedConnectorId = parseInt(urlParams.get('connector')) || 1;
const sessionId = urlParams.get('session');

let ws = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const maxReconnectDelay = 30000;

function connectWebSocket() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  
  ws = new WebSocket(`${WS_URL}?charger=${chargerId}&token=${token}`);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'update') {
      updateFromWebSocket(data);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    reconnectAttempts++;
  };
  
  ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    if (event.code === 4001 || event.code === 4002) {
      localStorage.removeItem('authToken');
      window.location.replace('/login.html');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
    reconnectTimer = setTimeout(connectWebSocket, delay);
  };
}

function updateFromWebSocket(data) {
  document.getElementById("status").innerText = data.status || "Unknown";
  
  const socValue = data.soc || 0;
  updateGauge(socValue);
  
  // VehicleInfo data (always available from DataTransfer)
  document.getElementById("vehicle-model").innerText = data.model || "--";
  document.getElementById("current-range").innerText = typeof data.range === 'number' ? data.range.toFixed(1) : (data.range || "--");
  document.getElementById("max-range").innerText = data.maxRange || "--";
  
  // MeterValues data (only during charging) - handle missing gracefully
  document.getElementById("voltage").innerText = data.voltage || "--";
  document.getElementById("current").innerText = data.current || "--";
  document.getElementById("power").innerText = data.power || "--";
  document.getElementById("energy").innerText = typeof data.energy === 'number' ? `${data.energy.toFixed(2)} Wh` : "0.00 Wh";
  
  const tempValue = (data.temperature !== null && data.temperature !== undefined && data.temperature !== "" && data.temperature !== "--") ? data.temperature : "N/A";
  document.getElementById("vehicle-temp").innerText = tempValue;
  
  const energyWh = typeof data.energy === 'number' ? data.energy : 0;
  const currentCost = (energyWh / 1000) * 15.00;
  document.getElementById("current-cost").innerText = `₹${currentCost.toFixed(2)}`;
  
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const endSessionBtn = document.getElementById("end-session-btn");
  
  if (data.status === "Charging") {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    endSessionBtn.disabled = false;
    
    if (sessionStartData.startSoc === null) {
      sessionStartData.startSoc = socValue;
      sessionStartData.startRange = parseFloat(data.range) || 0;
    }
    
    updateChargingProgress(socValue, parseFloat(data.range) || 0, currentCost);
    
    if (chargingTargets.mode) {
      checkAutoStop(socValue, parseFloat(data.range) || 0, currentCost);
    }
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    endSessionBtn.disabled = true;
    hideChargingProgress();
  }
}

let monitorInterval = null;
let timerInterval = null;
let chargingStartTime = null;
let sessionStartData = {
  startSoc: null,
  startRange: null,
  startEnergy: null
};
let chargingTargets = {
  mode: null,
  targetSoc: null,
  targetRange: null,
  targetAmount: null,
  targetTime: null,
  startTime: null,
  startSoc: null,
  startRange: null,
  paidAmount: null
};

function startChargingTimer() {
  chargingStartTime = Date.now();
  document.getElementById('timer-display').classList.remove('hidden');
  
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - chargingStartTime) / 1000);
    
    // Calculate estimated remaining time based on target
    let targetSeconds = 0;
    if (chargingTargets.targetTime) {
      targetSeconds = chargingTargets.targetTime * 60;
    }
    
    const remaining = Math.max(0, targetSeconds - elapsed);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    document.getElementById('timer-label').innerText = 'Time Remaining:';
    document.getElementById('timer-value').innerText = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Color based on remaining time
    const timerValue = document.getElementById('timer-value');
    if (remaining <= 60) {
      timerValue.style.color = '#ef4444';
    } else if (remaining <= 300) {
      timerValue.style.color = '#f59e0b';
    } else {
      timerValue.style.color = 'var(--primary)';
    }
  }, 1000);
}

function stopChargingTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.getElementById('timer-display').classList.add('hidden');
  chargingStartTime = null;
  
  // Reset auto-stop protection flag
  window.autoStopInProgress = false;
}

function updateChargingProgress(currentSoc, currentRange, currentCost) {
  if (!chargingTargets.mode) return;
  
  const progressDisplay = document.getElementById('progress-display');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const progressLabel = document.getElementById('progress-label');
  
  let progress = 0;
  let labelText = 'Target Progress:';
  
  const startSoc = sessionStartData.startSoc || chargingTargets.startSoc || 0;
  const startRange = sessionStartData.startRange || chargingTargets.startRange || 0;
  
  switch(chargingTargets.mode) {
    case 'soc':
      progress = Math.min(100, ((currentSoc - startSoc) / (chargingTargets.targetSoc - startSoc)) * 100);
      labelText = `Battery Target: ${chargingTargets.targetSoc}%`;
      break;
      
    case 'range':
      progress = Math.min(100, ((currentRange - startRange) / (chargingTargets.targetRange - startRange)) * 100);
      labelText = `Range Target: ${chargingTargets.targetRange}km`;
      break;
      
    case 'amount':
      progress = Math.min(100, (currentCost / chargingTargets.targetAmount) * 100);
      labelText = `Budget Target: ₹${chargingTargets.targetAmount}`;
      break;
      
    case 'time':
      if (chargingStartTime) {
        const elapsedMinutes = (Date.now() - chargingStartTime) / (1000 * 60);
        progress = Math.min(100, (elapsedMinutes / chargingTargets.targetTime) * 100);
        labelText = `Time Target: ${chargingTargets.targetTime}min`;
      }
      break;
  }
  
  progress = Math.max(0, progress);
  
  progressDisplay.classList.remove('hidden');
  progressFill.style.width = `${progress}%`;
  progressText.innerText = `${Math.round(progress)}%`;
  progressLabel.innerText = labelText;
  
  // Change color based on progress
  if (progress >= 90) {
    progressFill.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
  } else if (progress >= 70) {
    progressFill.style.background = 'linear-gradient(90deg, #10b981, #22c55e)';
  } else {
    progressFill.style.background = 'linear-gradient(90deg, #3b82f6, #10b981)';
  }
}

function hideChargingProgress() {
  document.getElementById('progress-display').classList.add('hidden');
}

function loadChargingTargets() {
  const stored = localStorage.getItem(`charging_targets_${chargerId}`);
  if (stored) {
    chargingTargets = JSON.parse(stored);
    console.log('Loaded charging targets:', chargingTargets);
  }
}

function clearChargingTargets() {
  localStorage.removeItem(`charging_targets_${chargerId}`);
  chargingTargets = {
    mode: null,
    targetSoc: null,
    targetRange: null,
    targetAmount: null,
    targetTime: null,
    startTime: null,
    startSoc: null,
    startRange: null,
    paidAmount: null
  };
}

function showChargingSummary(finalSoc, finalRange, actualCost, energyKwh) {
  const startSoc = sessionStartData.startSoc || chargingTargets.startSoc || 0;
  const startRange = sessionStartData.startRange || chargingTargets.startRange || 0;
  const startEnergy = sessionStartData.startEnergy || 0;
  const paidAmount = chargingTargets.paidAmount || actualCost;
  
  const actualEnergyAdded = energyKwh - startEnergy;
  
  // Calculate gains
  const socGain = finalSoc - startSoc;
  const rangeGain = finalRange - startRange;
  
  // Calculate efficiency (Wh/km)
  const efficiency = rangeGain > 0 ? (actualEnergyAdded * 1000) / rangeGain : 0;
  
  // Calculate charging duration
  const chargingDuration = chargingStartTime ? Math.floor((Date.now() - chargingStartTime) / 1000) : 0;
  const hours = Math.floor(chargingDuration / 3600);
  const minutes = Math.floor((chargingDuration % 3600) / 60);
  const seconds = chargingDuration % 60;
  const durationText = hours > 0 
    ? `${hours}h ${minutes}m ${seconds}s`
    : minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;
  
  // Update Vehicle Status
  document.getElementById('summary-soc').innerText = `${Math.round(startSoc)}% → ${Math.round(finalSoc)}%`;
  document.getElementById('summary-soc-gain').innerText = `+${Math.round(socGain)}%`;
  document.getElementById('summary-range').innerText = `${Math.round(startRange)}km → ${Math.round(finalRange)}km`;
  document.getElementById('summary-range-gain').innerText = `+${Math.round(rangeGain)} km`;
  document.getElementById('summary-energy').innerText = `${actualEnergyAdded.toFixed(2)} kWh`;
  document.getElementById('summary-efficiency').innerText = efficiency > 0 ? `${Math.round(efficiency)} Wh/km` : '--';
  document.getElementById('summary-duration').innerText = durationText;
  
  // Update Payment Details
  document.getElementById('summary-paid').innerText = `₹${paidAmount.toFixed(2)}`;
  document.getElementById('summary-actual').innerText = `₹${actualCost.toFixed(2)}`;
  document.getElementById('summary-breakdown').innerText = `${actualEnergyAdded.toFixed(2)} kWh × ₹15/kWh`;
  
  const now = new Date();
  document.getElementById('summary-timestamp').innerText = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const refundAmount = paidAmount - actualCost;
  if (refundAmount > 0.5) {
    document.getElementById('refund-section').classList.remove('hidden');
    document.getElementById('refund-amount').innerText = `₹${refundAmount.toFixed(2)}`;
  } else {
    document.getElementById('refund-section').classList.add('hidden');
  }
  
  document.getElementById('summary-overlay').classList.remove('hidden');
  
  // Prevent back navigation after summary
  history.pushState(null, '', window.location.href);
  window.addEventListener('popstate', preventBackAfterSummary);
  
  sessionStartData = { startSoc: null, startRange: null, startEnergy: null };
}

function preventBackAfterSummary(e) {
  history.pushState(null, '', window.location.href);
  showToast('Please start a new session', 'error');
}

window.startNewSession = function() {
  window.removeEventListener('popstate', preventBackAfterSummary);
  clearChargingTargets();
  sessionStartData = { startSoc: null, startRange: null, startEnergy: null };
  document.getElementById('summary-overlay').classList.add('hidden');
  window.location.href = '/select-charger.html';
};

window.closeSummary = function() {
  // Don't allow closing - force new session
  showToast('Please start a new session', 'error');
};

window.goToStations = function() {
  window.location.href = '/select-charger.html';
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

async function refreshStatus() {
  try {
    const [statusRes, activeRes] = await Promise.all([
      fetch(`${API}/chargers/${chargerId}/connectors/${selectedConnectorId}`),
      fetch(`${API}/chargers/${chargerId}/active`)
    ]);
    
    const statusData = await statusRes.json();
    const activeData = await activeRes.json();

    document.getElementById("status").innerText = statusData.status || "Unknown";

    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");
    const endSessionBtn = document.getElementById("end-session-btn");

    const isCharging = statusData.status === "Charging" && activeData.active;

    if (isCharging) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      endSessionBtn.disabled = false;
      
      if (!chargingStartTime) {
        startChargingTimer();
        
        // Capture session start data if not already captured
        if (sessionStartData.startSoc === null) {
          const socRes = await fetch(`${API}/chargers/${chargerId}/soc`);
          const socData = await socRes.json();
          
          sessionStartData.startSoc = socData.soc || 0;
          sessionStartData.startRange = parseFloat(socData.currentRangeKm) || 0;
          
          // Capture start energy from current energy reading
          const energyStr = socData.energy || "0.00 Wh";
          const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
          sessionStartData.startEnergy = energyWh / 1000; // Convert to kWh
          
          console.log('Captured session start data:', sessionStartData);
        }
      }
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      endSessionBtn.disabled = true;
      
      if (chargingStartTime) {
        stopChargingTimer();
        hideChargingProgress();
      }
    }
  } catch {
    document.getElementById("status").innerText = "Error";
  }
}

async function checkOCPPConnection() {
  try {
    const res = await fetch(`${API}/chargers/${chargerId}/health`);
    const data = await res.json();
    
    const dot = document.getElementById("ocpp-status");
    const text = document.getElementById("ocpp-text");
    
    if (data.online) {
      dot.className = "status-dot connected";
      text.innerText = "OCPP Connected";
      text.style.color = "var(--success)";
    } else {
      dot.className = "status-dot disconnected";
      text.innerText = "OCPP Offline";
      text.style.color = "var(--danger)";
    }
  } catch {
    const dot = document.getElementById("ocpp-status");
    const text = document.getElementById("ocpp-text");
    dot.className = "status-dot disconnected";
    text.innerText = "Connection Error";
    text.style.color = "var(--danger)";
  }
}

async function monitorPrepaidSession() {
  if (!sessionId) return;
  
  try {
    const res = await fetch(`${API}/prepaid/monitor/${sessionId}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    
    if (data.status === 'active') {
      const remaining = data.prepaidAmount - data.currentCost;
      document.getElementById('current-cost').innerText = `₹${data.currentCost.toFixed(2)} / ₹${data.prepaidAmount.toFixed(2)}`;
      
      if (data.percentComplete >= 100) {
        showToast('Prepaid limit reached. Charging stopped.', 'success');
        clearInterval(monitorInterval);
      }
    }
  } catch (error) {
    console.error('Monitor error:', error);
  }
}

async function refreshSOC() {
  try {
    const res = await fetch(`${API}/chargers/${chargerId}/soc`);
    const data = await res.json();
    
    const socValue = data.soc !== null ? data.soc : 0;
    updateGauge(socValue);
    
    document.getElementById("voltage").innerText = data.voltage || "--";
    document.getElementById("current").innerText = data.current || "--";
    document.getElementById("power").innerText = data.power || "--";
    document.getElementById("energy").innerText = data.energy || "--";
    
    const energyStr = data.energy || "0.00 Wh";
    const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
    const currentCost = (energyWh / 1000) * 15.00;
    document.getElementById("current-cost").innerText = `₹${currentCost.toFixed(2)}`;
    
    document.getElementById("vehicle-model").innerText = data.model || "--";
    document.getElementById("current-range").innerText = data.currentRangeKm || "--";
    document.getElementById("max-range").innerText = data.maxRangeKm || "--";
    
    const tempValue = (data.temperature !== null && data.temperature !== undefined && data.temperature !== "" && data.temperature !== "--") ? data.temperature : "N/A";
    document.getElementById("vehicle-temp").innerText = tempValue;
    
    localStorage.setItem(`soc_cache_${chargerId}`, JSON.stringify({ data, timestamp: Date.now() }));
    
    if (data.isCharging) {
      updateChargingProgress(socValue, parseFloat(data.currentRangeKm) || 0, currentCost);
      
      if (chargingTargets.mode) {
        checkAutoStop(socValue, parseFloat(data.currentRangeKm) || 0, currentCost);
      }
    } else {
      hideChargingProgress();
    }
  } catch (error) {
    console.error("SOC error:", error);
    updateGauge(0);
  }
}

function loadCachedData() {
  const cached = localStorage.getItem(`soc_cache_${chargerId}`);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30000) {
        const socValue = data.soc !== null ? data.soc : 0;
        updateGauge(socValue);
        document.getElementById("voltage").innerText = data.voltage || "--";
        document.getElementById("current").innerText = data.current || "--";
        document.getElementById("power").innerText = data.power || "--";
        document.getElementById("energy").innerText = data.energy || "--";
        const energyStr = data.energy || "0.00 Wh";
        const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
        document.getElementById("current-cost").innerText = `₹${(energyWh / 1000 * 10).toFixed(2)}`;
        document.getElementById("vehicle-model").innerText = data.model || "--";
        document.getElementById("current-range").innerText = data.currentRangeKm || "--";
        document.getElementById("max-range").innerText = data.maxRangeKm || "--";
        
        const cachedTempValue = (data.temperature !== null && data.temperature !== undefined && data.temperature !== "" && data.temperature !== "--") ? data.temperature : "N/A";
        document.getElementById("vehicle-temp").innerText = cachedTempValue;
        return true;
      }
    } catch (e) {}
  }
  return false;
}

async function checkAutoStop(currentSoc, currentRange, currentCost) {
  let shouldStop = false;
  let reason = '';
  
  console.log('Auto-stop check:', {
    mode: chargingTargets.mode,
    currentSoc: currentSoc.toFixed(1),
    targetSoc: chargingTargets.targetSoc,
    currentRange: currentRange.toFixed(1),
    targetRange: chargingTargets.targetRange,
    currentCost: currentCost.toFixed(2),
    targetAmount: chargingTargets.targetAmount,
    elapsedTime: chargingStartTime ? ((Date.now() - chargingStartTime) / 60000).toFixed(1) + 'min' : 'N/A',
    targetTime: chargingTargets.targetTime
  });
  
  switch(chargingTargets.mode) {
    case 'soc':
      if (currentSoc >= chargingTargets.targetSoc) {
        shouldStop = true;
        reason = `🔋 Target battery ${chargingTargets.targetSoc}% reached (${currentSoc.toFixed(1)}%)`;
      }
      break;
      
    case 'range':
      if (currentRange >= chargingTargets.targetRange) {
        shouldStop = true;
        reason = `🚗 Target range ${chargingTargets.targetRange}km reached (${currentRange.toFixed(1)}km)`;
      }
      break;
      
    case 'amount':
      if (currentCost >= chargingTargets.targetAmount) {
        shouldStop = true;
        reason = `💰 Target amount ₹${chargingTargets.targetAmount} reached (₹${currentCost.toFixed(2)})`;
      }
      break;
      
    case 'time':
      if (chargingStartTime) {
        const elapsedMinutes = (Date.now() - chargingStartTime) / (1000 * 60);
        if (elapsedMinutes >= chargingTargets.targetTime) {
          shouldStop = true;
          reason = `⏰ Target time ${chargingTargets.targetTime}min reached (${elapsedMinutes.toFixed(1)}min)`;
        }
      }
      break;
  }
  
  if (shouldStop) {
    console.log('🛑 Auto-stop triggered:', reason);
    showToast(reason, 'success');
    
    // Prevent multiple auto-stop calls
    if (window.autoStopInProgress) {
      console.log('🛑 Auto-stop already in progress, skipping');
      return;
    }
    window.autoStopInProgress = true;
    
    // Check current status before attempting to stop
    try {
      const statusRes = await fetch(`${API}/chargers/${chargerId}/connectors/${selectedConnectorId}`);
      const statusData = await statusRes.json();
      
      if (statusData.status === 'Charging') {
        await autoStopCharging();
      } else {
        console.log('🛑 Auto-stop: Charging already stopped, status:', statusData.status);
        await autoStopCharging(); // Still call to handle UI updates and summary
      }
    } catch (error) {
      console.error('Auto-stop status check failed:', error);
      await autoStopCharging(); // Proceed anyway
    } finally {
      window.autoStopInProgress = false;
    }
  }
}

async function autoStopCharging() {
  try {
    // First check if there's an active transaction
    const activeRes = await fetch(`${API}/chargers/${chargerId}/active`);
    const activeData = await activeRes.json();
    
    if (!activeData.active) {
      console.log('🛑 Auto-stop: No active transaction found, charging already stopped');
      showToast('Charging target reached - session completed!', 'success');
      
      // Update UI to reflect stopped state
      const startBtn = document.getElementById("start-btn");
      const stopBtn = document.getElementById("stop-btn");
      const endSessionBtn = document.getElementById("end-session-btn");
      
      startBtn.disabled = false;
      stopBtn.disabled = true;
      endSessionBtn.disabled = true;
      
      stopChargingTimer();
      hideChargingProgress();
      
      // Get final SOC data for summary
      const socRes = await fetch(`${API}/chargers/${chargerId}/soc`);
      const socData = await socRes.json();
      
      const energyStr = socData.energy || "0.00 Wh";
      const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
      const energyKwh = energyWh / 1000;
      const actualCost = energyKwh * 15.00;
      
      setTimeout(() => {
        showChargingSummary(
          socData.soc || 0,
          parseFloat(socData.currentRangeKm) || 0,
          actualCost,
          energyKwh
        );
      }, 1000);
      
      clearChargingTargets();
      setTimeout(refreshStatus, 1000);
      return;
    }
    
    // If there is an active transaction, proceed with stop
    console.log('🛑 Auto-stop: Active transaction found, sending stop command');
    const socRes = await fetch(`${API}/chargers/${chargerId}/soc`);
    const socData = await socRes.json();
    
    const response = await fetch(`${API}/chargers/${chargerId}/stop`, { 
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      showToast('Charging auto-stopped successfully!', 'success');
      
      // Immediately update button states
      const startBtn = document.getElementById("start-btn");
      const stopBtn = document.getElementById("stop-btn");
      const endSessionBtn = document.getElementById("end-session-btn");
      
      startBtn.disabled = false;
      stopBtn.disabled = true;
      endSessionBtn.disabled = true;
      
      stopChargingTimer();
      hideChargingProgress();
      
      const energyStr = socData.energy || "0.00 Wh";
      const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
      const energyKwh = energyWh / 1000;
      const actualCost = energyKwh * 15.00;
      
      setTimeout(() => {
        showChargingSummary(
          socData.soc || 0,
          parseFloat(socData.currentRangeKm) || 0,
          actualCost,
          energyKwh
        );
      }, 1000);
      
      clearChargingTargets();
      setTimeout(refreshStatus, 1000);
    } else {
      const errorData = await response.json();
      console.error('Auto-stop failed:', errorData);
      showToast('Auto-stop failed: ' + (errorData.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Auto-stop error:', error);
    showToast('Auto-stop error: ' + error.message, 'error');
  }
}

function updateGauge(soc) {
  const ring = document.getElementById("soc-ring");
  const socValueEl = document.getElementById("soc-value");

  const circumference = 534;
  const value = Math.max(0, Math.min(100, soc));
  const offset = circumference - (value / 100) * circumference;

  ring.style.strokeDashoffset = offset;
  socValueEl.innerText = value ? parseFloat(value).toFixed(1) : "--";

  ring.style.filter = `drop-shadow(0 0 ${10 + value / 4}px rgba(59,130,246,0.9))`;
}

document.getElementById("start-btn").onclick = async () => {
  const btn = document.getElementById("start-btn");
  const originalText = btn.innerText;
  
  try {
    btn.classList.add('loading');
    btn.innerText = '⏳ STARTING...';
    
    const response = await fetch(`${API}/chargers/${chargerId}/start`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        connectorId: selectedConnectorId,
        idTag: "TEST_TAG"
      })
    });
    
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken');
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => window.location.replace('/login.html'), 1500);
      return;
    }
    
    if (response.ok) {
      showToast('Start command sent successfully!', 'success');
      setTimeout(refreshStatus, 2000);
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to start charging', 'error');
    }
  } catch (error) {
    console.error('Start error:', error);
    showToast('Connection error', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.innerText = originalText;
  }
};

document.getElementById("stop-btn").onclick = async () => {
  const btn = document.getElementById("stop-btn");
  const originalText = btn.innerText;
  
  try {
    btn.classList.add('loading');
    btn.innerText = '⏳ STOPPING...';
    
    const response = await fetch(`${API}/chargers/${chargerId}/stop`, { 
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({})
    });
    
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken');
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => window.location.replace('/login.html'), 1500);
      return;
    }
    
    if (response.ok) {
      showToast('Stop command sent successfully!', 'success');
      setTimeout(refreshStatus, 2000);
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to stop charging', 'error');
    }
  } catch (error) {
    console.error('Stop error:', error);
    showToast('Connection error', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.innerText = originalText;
  }
};

document.getElementById("end-session-btn").onclick = async () => {
  const btn = document.getElementById("end-session-btn");
  const originalText = btn.innerText;
  
  try {
    btn.classList.add('loading');
    btn.innerText = '⏳ ENDING...';
    
    const socRes = await fetch(`${API}/chargers/${chargerId}/soc`);
    const socData = await socRes.json();
    
    const response = await fetch(`${API}/chargers/${chargerId}/stop`, { 
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({})
    });
    const data = await response.json();
    
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken');
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => window.location.replace('/login.html'), 1500);
      return;
    }
    
    if (response.ok) {
      showToast('Session ended - Generating summary...', 'success');
      
      // Immediately update button states
      const startBtn = document.getElementById("start-btn");
      const stopBtn = document.getElementById("stop-btn");
      const endSessionBtn = document.getElementById("end-session-btn");
      
      startBtn.disabled = false;
      stopBtn.disabled = true;
      endSessionBtn.disabled = true;
      
      stopChargingTimer();
      hideChargingProgress();
      
      const energyStr = socData.energy || "0.00 Wh";
      const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
      const energyKwh = energyWh / 1000;
      const actualCost = energyKwh * 15.00;
      
      setTimeout(() => {
        showChargingSummary(
          socData.soc || 0,
          parseFloat(socData.currentRangeKm) || 0,
          actualCost,
          energyKwh
        );
      }, 1000);
      
      clearChargingTargets();
      setTimeout(refreshStatus, 1000);
    } else {
      showToast(data.error || 'Failed to end session', 'error');
    }
  } catch (error) {
    console.error('End session error:', error);
    showToast('Connection error', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.innerText = originalText;
  }
};

window.onload = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.log('No auth token found, redirecting to login');
    window.location.replace('/login.html');
    return;
  }
  
  loadChargingTargets();
  
  document.getElementById('back-btn').onclick = () => {
    window.location.href = '/select-charger.html';
  };
  
  document.getElementById('charger-display').innerText = chargerId;
  document.getElementById('charger-display').onclick = () => {
    window.location.href = '/select-charger.html';
  };
  
  document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('authToken');
    window.location.replace('/login.html');
  };
  
  connectWebSocket();
  
  const hasCached = loadCachedData();
  if (!hasCached) updateGauge(0);
  
  Promise.all([refreshStatus(), refreshSOC(), checkOCPPConnection()]);
  
  setInterval(refreshSOC, 30000);
  
  // More frequent auto-stop checks during charging
  setInterval(() => {
    const currentStatus = document.getElementById('status').innerText;
    if (chargingTargets.mode && currentStatus === 'Charging') {
      refreshSOC(); // This will trigger checkAutoStop
    } else if (chargingTargets.mode && currentStatus !== 'Charging' && chargingStartTime) {
      // If we have targets but charging stopped, check if we should show summary
      console.log('🔍 Charging stopped with active targets, checking for auto-completion');
      autoStopCharging();
    }
  }, 10000); // Check every 10 seconds
  
  if (sessionId) {
    monitorInterval = setInterval(monitorPrepaidSession, 5000);
    monitorPrepaidSession();
  }
  
  document.getElementById("end-session-btn").disabled = true;
};
