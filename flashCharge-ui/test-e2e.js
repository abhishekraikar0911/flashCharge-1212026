// 🧪 Browser Console Test Script
// Copy and paste this into browser console (F12) to test the complete flow

console.log('🚀 Starting flashCharge End-to-End Test...\n');

// Configuration
const API_BASE = window.location.origin + '/api';
const TEST_USER = { username: 'user', password: 'user' };
const TEST_CHARGER = 'RIVOT_100A_01';
const TEST_CONNECTOR = 1;

let authToken = null;
let sessionId = null;

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers
  };
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }
  
  return data;
}

// Test 1: Authentication
async function testAuth() {
  console.log('📝 Test 1: Authentication');
  
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    });
    
    if (data.success && data.token) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      console.log('✅ Login successful');
      console.log('   Token:', authToken.substring(0, 20) + '...');
      console.log('   User:', data.user.username, '(Role:', data.user.role + ')');
      return true;
    } else {
      console.error('❌ Login failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

// Test 2: List Chargers
async function testListChargers() {
  console.log('\n📝 Test 2: List Chargers');
  
  try {
    const chargers = await apiCall('/chargers/list');
    console.log('✅ Chargers found:', chargers.length);
    chargers.forEach(c => console.log('   -', c));
    return chargers.length > 0;
  } catch (error) {
    console.error('❌ List chargers error:', error.message);
    return false;
  }
}

// Test 3: Get Connectors
async function testGetConnectors() {
  console.log('\n📝 Test 3: Get Connectors');
  
  try {
    const connectors = await apiCall(`/chargers/${TEST_CHARGER}/connectors`);
    console.log('✅ Connectors found:', connectors.length);
    connectors.forEach(c => {
      console.log(`   - Connector ${c.connectorId}: ${c.status}`);
    });
    return connectors.length > 0;
  } catch (error) {
    console.error('❌ Get connectors error:', error.message);
    return false;
  }
}

// Test 4: Get Charging Parameters
async function testChargingParams() {
  console.log('\n📝 Test 4: Get Charging Parameters');
  
  try {
    const params = await apiCall(`/chargers/${TEST_CHARGER}/charging-params`);
    console.log('✅ Charging parameters loaded:');
    console.log('   SOC:', params.currentSOC + '%');
    console.log('   Range:', params.currentRangeKm, 'km /', params.maxRangeKm, 'km');
    console.log('   Variant:', params.variant);
    console.log('   Capacity:', params.currentAh, 'Ah /', params.maxCapacityAh, 'Ah');
    console.log('   Cost:', '₹' + params.costPerKWh, '/kWh');
    return true;
  } catch (error) {
    console.error('❌ Charging params error:', error.message);
    return false;
  }
}

// Test 5: Create Prepaid Session
async function testCreateSession() {
  console.log('\n📝 Test 5: Create Prepaid Session');
  
  try {
    const data = await apiCall('/prepaid/create', {
      method: 'POST',
      body: JSON.stringify({
        chargerId: TEST_CHARGER,
        connectorId: TEST_CONNECTOR,
        amount: 20.50,
        maxEnergyWh: 7000,
        maxDurationSec: 1800
      })
    });
    
    if (data.success && data.sessionId) {
      sessionId = data.sessionId;
      console.log('✅ Session created');
      console.log('   Session ID:', sessionId);
      console.log('   Message:', data.message);
      return true;
    } else {
      console.error('❌ Session creation failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Create session error:', error.message);
    return false;
  }
}

// Test 6: Start Charging
async function testStartCharging() {
  console.log('\n📝 Test 6: Start Charging');
  
  if (!sessionId) {
    console.error('❌ No session ID available');
    return false;
  }
  
  try {
    const paymentId = 'TEST_PAYMENT_' + Date.now();
    const data = await apiCall('/prepaid/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: sessionId,
        paymentId: paymentId
      })
    });
    
    if (data.success) {
      console.log('✅ Charging started');
      console.log('   Payment ID:', paymentId);
      console.log('   Result:', data.result);
      return true;
    } else {
      console.error('❌ Start charging failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Start charging error:', error.message);
    return false;
  }
}

// Test 7: Monitor Session
async function testMonitorSession() {
  console.log('\n📝 Test 7: Monitor Session');
  
  if (!sessionId) {
    console.error('❌ No session ID available');
    return false;
  }
  
  try {
    const data = await apiCall(`/prepaid/monitor/${sessionId}`);
    console.log('✅ Session monitoring:');
    console.log('   Status:', data.status);
    
    if (data.status === 'active') {
      console.log('   Current Energy:', data.currentEnergy, 'Wh');
      console.log('   Current Cost: ₹' + data.currentCost.toFixed(2));
      console.log('   Progress:', data.percentComplete.toFixed(1) + '%');
      console.log('   Max Energy:', data.maxEnergy, 'Wh');
      console.log('   Prepaid Amount: ₹' + data.prepaidAmount);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Monitor session error:', error.message);
    return false;
  }
}

// Test 8: Get Real-time SOC
async function testGetSOC() {
  console.log('\n📝 Test 8: Get Real-time SOC');
  
  try {
    const data = await apiCall(`/chargers/${TEST_CHARGER}/soc`);
    console.log('✅ Real-time data:');
    console.log('   SOC:', data.soc + '%');
    console.log('   Voltage:', data.voltage);
    console.log('   Current:', data.current);
    console.log('   Power:', data.power);
    console.log('   Energy:', data.energy);
    console.log('   Model:', data.model);
    console.log('   Range:', data.currentRangeKm, 'km /', data.maxRangeKm, 'km');
    console.log('   Charging:', data.isCharging);
    return true;
  } catch (error) {
    console.error('❌ Get SOC error:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 flashCharge End-to-End Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results = {
    auth: await testAuth(),
    listChargers: await testListChargers(),
    getConnectors: await testGetConnectors(),
    chargingParams: await testChargingParams(),
    createSession: await testCreateSession(),
    startCharging: await testStartCharging(),
    monitorSession: await testMonitorSession(),
    getSOC: await testGetSOC()
  };
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════════════════════════');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}`);
  });
  
  console.log('\n' + '─'.repeat(55));
  console.log(`Total: ${passed}/${total} tests passed (${(passed/total*100).toFixed(0)}%)`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (passed === total) {
    console.log('🎉 All tests passed! System is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check errors above.');
  }
  
  return results;
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
});
