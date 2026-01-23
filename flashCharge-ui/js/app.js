const API = "/api";
const urlParams = new URLSearchParams(window.location.search);
const chargerId = urlParams.get('charger') || "RIVOT_100A_01";
let selectedConnectorId = parseInt(urlParams.get('connector')) || 1;
const sessionId = urlParams.get('session');

let monitorInterval = null;
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
  
  document.getElementById('summary-soc').innerText = `${Math.round(startSoc)}% → ${Math.round(finalSoc)}%`;
  document.getElementById('summary-range').innerText = `${Math.round(startRange)}km → ${Math.round(finalRange)}km`;
  document.getElementById('summary-energy').innerText = `${actualEnergyAdded.toFixed(2)} kWh`;
  document.getElementById('summary-paid').innerText = `₹${paidAmount}`;
  document.getElementById('summary-actual').innerText = `₹${actualCost.toFixed(2)}`;
  
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
  
  sessionStartData = { startSoc: null, startRange: null, startEnergy: null };
}

window.closeSummary = function() {
  document.getElementById('summary-overlay').classList.add('hidden');
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
    const res = await fetch(`${API}/chargers/${chargerId}/connectors/${selectedConnectorId}`);
    const data = await res.json();

    document.getElementById("status").innerText = data.status || "Unknown";

    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");
    const endSessionBtn = document.getElementById("end-session-btn");

    if (data.status === "Charging") {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      endSessionBtn.disabled = false;
      
      if (sessionStartData.startSoc === null) {
        const socRes = await fetch(`${API}/chargers/${chargerId}/soc`);
        const socData = await socRes.json();
        
        sessionStartData.startSoc = socData.soc || 0;
        sessionStartData.startRange = parseFloat(socData.currentRangeKm) || 0;
        
        const energyStr = socData.energy || "0.00 Wh";
        const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
        sessionStartData.startEnergy = energyWh / 1000;
        
        console.log('Captured session start data:', sessionStartData);
      }
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      endSessionBtn.disabled = true;
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
    const currentCost = (energyWh / 1000) * 10.00;
    document.getElementById("current-cost").innerText = `₹${currentCost.toFixed(2)}`;
    
    document.getElementById("vehicle-model").innerText = data.model || "--";
    document.getElementById("current-range").innerText = data.currentRangeKm || "--";
    document.getElementById("max-range").innerText = data.maxRangeKm || "--";
    
    if (data.isCharging && chargingTargets.mode) {
      checkAutoStop(socValue, parseFloat(data.currentRangeKm) || 0, currentCost);
    }
  } catch (error) {
    console.error("SOC error:", error);
    updateGauge(0);
  }
}

async function checkAutoStop(currentSoc, currentRange, currentCost) {
  let shouldStop = false;
  let reason = '';
  
  switch(chargingTargets.mode) {
    case 'soc':
      if (currentSoc >= chargingTargets.targetSoc) {
        shouldStop = true;
        reason = `Target battery ${chargingTargets.targetSoc}% reached`;
      }
      break;
      
    case 'range':
      if (currentRange >= chargingTargets.targetRange) {
        shouldStop = true;
        reason = `Target range ${chargingTargets.targetRange}km reached`;
      }
      break;
      
    case 'amount':
      if (currentCost >= chargingTargets.targetAmount) {
        shouldStop = true;
        reason = `Target amount ₹${chargingTargets.targetAmount} reached`;
      }
      break;
      
    case 'time':
      if (chargingTargets.startTime) {
        const elapsedMinutes = (Date.now() - chargingTargets.startTime) / (1000 * 60);
        if (elapsedMinutes >= chargingTargets.targetTime) {
          shouldStop = true;
          reason = `Target time ${chargingTargets.targetTime} minutes reached`;
        }
      }
      break;
  }
  
  if (shouldStop) {
    console.log('Auto-stop triggered:', reason);
    showToast(reason, 'success');
    await autoStopCharging();
  }
}

async function autoStopCharging() {
  try {
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
      
      const energyStr = socData.energy || "0.00 Wh";
      const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
      const energyKwh = energyWh / 1000;
      const actualCost = energyKwh * 10.00;
      
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
    }
  } catch (error) {
    console.error('Auto-stop error:', error);
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
    const data = await response.json();
    
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken');
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => window.location.replace('/login.html'), 1500);
      return;
    }
    
    if (response.ok) {
      showToast('Charging started successfully!', 'success');
      
      const socRes = await fetch(`${API}/chargers/${chargerId}/soc`);
      const socData = await socRes.json();
      
      sessionStartData.startSoc = socData.soc || 0;
      sessionStartData.startRange = parseFloat(socData.currentRangeKm) || 0;
      
      const energyStr = socData.energy || "0.00 Wh";
      const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
      sessionStartData.startEnergy = energyWh / 1000;
      
      console.log('Captured start data on manual start:', sessionStartData);
      
      setTimeout(refreshStatus, 1000);
    } else {
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
      showToast('Charging stopped successfully!', 'success');
      clearChargingTargets();
      setTimeout(refreshStatus, 1000);
    } else {
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
      
      const energyStr = socData.energy || "0.00 Wh";
      const energyWh = parseFloat(energyStr.replace(/[^0-9.]/g, '')) || 0;
      const energyKwh = energyWh / 1000;
      const actualCost = energyKwh * 10.00;
      
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
  
  updateGauge(0);
  refreshStatus();
  refreshSOC();
  checkOCPPConnection();
  setInterval(refreshStatus, 5000);
  setInterval(refreshSOC, 5000);
  setInterval(checkOCPPConnection, 10000);
  
  if (sessionId) {
    monitorInterval = setInterval(monitorPrepaidSession, 5000);
    monitorPrepaidSession();
  }
  
  document.getElementById("end-session-btn").disabled = true;
};
