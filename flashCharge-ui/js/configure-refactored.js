import { CHARGING_MODES, SLIDER_CONFIG, ROUTES } from './utils/constants.js';
import { calculateFromRange, calculateFromTime, calculateFromAmount, calculateFull } from './utils/calculations.js';
import { getChargingParams, startCharging } from './services/api.js';
import { showToast, getUrlParams, setButtonLoading, formatCost, formatTime, formatEnergy, formatSOC, formatRange } from './utils/ui.js';
import { initiatePayment } from './services/payment.js';

let params = null;
let currentMode = CHARGING_MODES.RANGE;
let currentPrediction = null;
let paymentCompleted = false;
const { chargerId, connectorId } = getUrlParams();

async function loadParams() {
  try {
    params = await getChargingParams(chargerId);
    
    if (!params) return;
    
    document.getElementById('charger-info').innerText = 
      `${chargerId} • Connector ${connectorId} • NX-100 ${params.variant} • ${params.currentSOC.toFixed(1)}% • ${params.currentRangeKm.toFixed(0)} km`;
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('config-ui').style.display = 'block';
    
    setupMode(CHARGING_MODES.RANGE);
  } catch (error) {
    console.error('Load params error:', error);
    showToast('Failed to load battery parameters', 'error');
  }
}

function updatePredictions(value) {
  console.log('updatePredictions called with:', value, 'mode:', currentMode);
  let result;
  
  switch(currentMode) {
    case CHARGING_MODES.RANGE:
      result = calculateFromRange(value, params);
      break;
    case CHARGING_MODES.TIME:
      result = calculateFromTime(value, params);
      break;
    case CHARGING_MODES.AMOUNT:
      result = calculateFromAmount(value, params);
      break;
    case CHARGING_MODES.FULL:
      result = calculateFull(params);
      break;
  }
  
  console.log('Calculation result:', result);
  
  if (!result) return;
  
  currentPrediction = result;
  
  if (result.alreadyFull) {
    document.getElementById('pred-energy').innerText = '--';
    document.getElementById('pred-time').innerText = 'Already FULL';
    document.getElementById('pred-soc').innerText = '90%';
    document.getElementById('pred-range').innerText = params.maxRangeKm + ' km';
    document.getElementById('pred-cost').innerText = '₹0.00';
    document.getElementById('pay-btn').disabled = true;
    document.getElementById('pay-btn').innerText = '💳 PAY ₹0.00';
    return;
  }
  
  document.getElementById('pred-energy').innerText = formatEnergy(result.energykWh);
  document.getElementById('pred-time').innerText = formatTime(result.timeMin);
  document.getElementById('pred-soc').innerText = formatSOC(result.finalSOC);
  document.getElementById('pred-range').innerText = formatRange(result.finalRange);
  document.getElementById('pred-cost').innerText = formatCost(result.cost);
  
  // Update pay button with amount
  const payBtn = document.getElementById('pay-btn');
  payBtn.innerText = `💳 PAY ${formatCost(result.cost)}`;
  payBtn.disabled = false;
  
  // Reset payment state when prediction changes
  paymentCompleted = false;
}

function setupMode(mode) {
  currentMode = mode;
  const slider = document.getElementById('slider');
  const sliderContainer = document.getElementById('slider-container');
  const inputLabel = document.getElementById('input-label');
  
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  
  if (mode === CHARGING_MODES.RANGE) {
    sliderContainer.style.display = 'block';
    const min = Math.ceil(params.currentRangeKm + SLIDER_CONFIG.RANGE.min);
    const max = params.maxRangeKm;
    const defaultVal = Math.min(params.currentRangeKm + 50, max);
    
    slider.min = min;
    slider.max = max;
    slider.value = defaultVal;
    slider.step = SLIDER_CONFIG.RANGE.step;
    
    document.getElementById('slider-min').innerText = min + ' km';
    document.getElementById('slider-max').innerText = max + ' km';
    
    slider.oninput = () => {
      const value = parseInt(slider.value);
      inputLabel.innerHTML = `Target Range: <span id="input-display">${value} km</span>`;
      updatePredictions(value);
    };
    
    inputLabel.innerHTML = `Target Range: <span id="input-display">${defaultVal} km</span>`;
    updatePredictions(defaultVal);
    
  } else if (mode === CHARGING_MODES.TIME) {
    sliderContainer.style.display = 'block';
    slider.min = SLIDER_CONFIG.TIME.min;
    slider.max = SLIDER_CONFIG.TIME.max;
    slider.value = 30;
    slider.step = SLIDER_CONFIG.TIME.step;
    
    document.getElementById('slider-min').innerText = SLIDER_CONFIG.TIME.min + ' min';
    document.getElementById('slider-max').innerText = SLIDER_CONFIG.TIME.max + ' min';
    
    slider.oninput = () => {
      const value = parseInt(slider.value);
      console.log('TIME slider moved to:', value);
      inputLabel.innerHTML = `Charge Time: <span id="input-display">${value} min</span>`;
      updatePredictions(value);
    };
    
    inputLabel.innerHTML = `Charge Time: <span id="input-display">30 min</span>`;
    updatePredictions(30);
    
  } else if (mode === CHARGING_MODES.AMOUNT) {
    sliderContainer.style.display = 'block';
    slider.min = SLIDER_CONFIG.AMOUNT.min;
    slider.max = SLIDER_CONFIG.AMOUNT.max;
    slider.value = 20;
    slider.step = SLIDER_CONFIG.AMOUNT.step;
    
    document.getElementById('slider-min').innerText = '₹' + SLIDER_CONFIG.AMOUNT.min;
    document.getElementById('slider-max').innerText = '₹' + SLIDER_CONFIG.AMOUNT.max;
    
    slider.oninput = () => {
      const value = parseInt(slider.value);
      inputLabel.innerHTML = `Charge Amount: <span id="input-display">₹${value}</span>`;
      updatePredictions(value);
    };
    
    inputLabel.innerHTML = `Charge Amount: <span id="input-display">₹20</span>`;
    updatePredictions(20);
    
  } else if (mode === CHARGING_MODES.FULL) {
    sliderContainer.style.display = 'none';
    inputLabel.innerHTML = 'Charge to FULL (90% SOC)';
    updatePredictions(null);
  }
}

document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.onclick = () => setupMode(tab.dataset.mode);
});

// Payment button handler
document.getElementById('pay-btn').onclick = async () => {
  const payBtn = document.getElementById('pay-btn');
  const startBtn = document.getElementById('start-btn');
  
  if (!currentPrediction || currentPrediction.alreadyFull) {
    showToast('Invalid charging configuration', 'error');
    return;
  }
  
  setButtonLoading(payBtn, true, '⏳ PROCESSING PAYMENT...');
  
  try {
    // Step 1: Create prepaid session
    const sessionResponse = await fetch('/api/prepaid/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        chargerId,
        connectorId: parseInt(connectorId),
        amount: parseFloat(currentPrediction.cost),
        maxEnergyWh: Math.round(currentPrediction.energykWh * 1000),
        maxDurationSec: Math.round(currentPrediction.timeMin * 60)
      })
    });
    
    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      console.error('Session creation failed:', errorData);
      console.error('Status:', sessionResponse.status);
      console.error('Request body:', {
        chargerId,
        connectorId: parseInt(connectorId),
        amount: parseFloat(currentPrediction.cost),
        maxEnergyWh: Math.round(currentPrediction.energykWh * 1000),
        maxDurationSec: Math.round(currentPrediction.timeMin * 60)
      });
      
      if (sessionResponse.status === 401 || sessionResponse.status === 403) {
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => window.location.href = ROUTES.LOGIN, 2000);
      } else {
        showToast(errorData.error || 'Failed to create session', 'error');
      }
      setButtonLoading(payBtn, false);
      return;
    }
    
    const sessionData = await sessionResponse.json();
    if (!sessionData.success) {
      showToast(sessionData.error || 'Failed to create session', 'error');
      setButtonLoading(payBtn, false);
      return;
    }
    
    // Step 2: Mock payment (replace with real gateway)
    const paymentResult = await initiatePayment(
      currentPrediction.cost,
      chargerId,
      connectorId,
      currentMode,
      currentPrediction
    );
    
    if (!paymentResult.success) {
      showToast('Payment failed', 'error');
      setButtonLoading(payBtn, false);
      return;
    }
    
    // Step 3: Start charging with prepaid session
    const startResponse = await fetch('/api/prepaid/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        paymentId: paymentResult.transactionId
      })
    });
    
    if (!startResponse.ok) {
      const errorData = await startResponse.json();
      console.error('Start charging failed:', errorData);
      showToast(errorData.error || 'Failed to start charging', 'error');
      setButtonLoading(payBtn, false);
      return;
    }
    
    const startData = await startResponse.json();
    if (startData.success) {
      showToast(`Payment successful! ₹${currentPrediction.cost.toFixed(2)} paid`, 'success');
      setTimeout(() => {
        window.location.href = `${ROUTES.DASHBOARD}?charger=${chargerId}&connector=${connectorId}&session=${sessionData.sessionId}`;
      }, 1000);
    } else {
      showToast(startData.error || 'Failed to start charging', 'error');
      setButtonLoading(payBtn, false);
    }
  } catch (error) {
    console.error('Payment error:', error);
    showToast('Payment error. Please try again.', 'error');
    setButtonLoading(payBtn, false);
  }
};



document.getElementById('back-btn').onclick = () => {
  window.location.href = ROUTES.SELECT_CHARGER;
};

document.getElementById('logout-btn').onclick = () => {
  localStorage.removeItem('authToken');
  window.location.replace(ROUTES.LOGIN);
};

window.onload = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.replace(ROUTES.LOGIN);
    return;
  }
  
  if (!chargerId || !connectorId) {
    showToast('Invalid parameters', 'error');
    setTimeout(() => window.location.href = ROUTES.SELECT_CHARGER, 1500);
    return;
  }
  
  loadParams();
};
