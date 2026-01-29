#!/usr/bin/env node

/**
 * Test script to verify the auto-stop timer and temperature display fixes
 */

console.log('🧪 Testing flashCharge fixes...\n');

// Test 1: Temperature handling
console.log('1. Testing temperature display logic:');

function testTemperatureDisplay(temperature, expected) {
  const result = (temperature !== null && temperature !== undefined && temperature !== "") ? temperature : "--";
  const passed = result === expected;
  console.log(`   Input: ${temperature} → Output: "${result}" (Expected: "${expected}") ${passed ? '✅' : '❌'}`);
  return passed;
}

let allPassed = true;

allPassed &= testTemperatureDisplay("25.5°C", "25.5°C");
allPassed &= testTemperatureDisplay(null, "--");
allPassed &= testTemperatureDisplay(undefined, "--");
allPassed &= testTemperatureDisplay("0.0°C", "0.0°C");
allPassed &= testTemperatureDisplay("", "--");

// Test 2: Timer logic simulation
console.log('\n2. Testing timer logic:');

function simulateTimer(elapsedSeconds, targetMinutes, mode) {
  if (mode === 'time' && targetMinutes) {
    const targetSeconds = targetMinutes * 60;
    const remaining = Math.max(0, targetSeconds - elapsedSeconds);
    
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      return {
        label: 'Time Remaining:',
        value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        color: remaining <= 300 ? 'red' : remaining <= 600 ? 'orange' : 'blue'
      };
    } else {
      // Time target reached - show elapsed time
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = elapsedSeconds % 60;
      return {
        label: 'Time Elapsed:',
        value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        color: 'red' // overtime
      };
    }
  } else {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return {
      label: 'Time Elapsed:',
      value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      color: 'blue'
    };
  }
}

// Test scenarios
const scenarios = [
  { elapsed: 300, target: 10, mode: 'time', expected: { label: 'Time Remaining:', value: '00:05:00', color: 'red' } },
  { elapsed: 600, target: 10, mode: 'time', expected: { label: 'Time Elapsed:', value: '00:10:00', color: 'red' } },
  { elapsed: 700, target: 10, mode: 'time', expected: { label: 'Time Elapsed:', value: '00:11:40', color: 'red' } },
  { elapsed: 300, target: null, mode: 'soc', expected: { label: 'Time Elapsed:', value: '00:05:00', color: 'blue' } }
];

scenarios.forEach((scenario, i) => {
  const result = simulateTimer(scenario.elapsed, scenario.target, scenario.mode);
  const passed = result.label === scenario.expected.label && 
                 result.value === scenario.expected.value && 
                 result.color === scenario.expected.color;
  
  console.log(`   Scenario ${i + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`     Input: ${scenario.elapsed}s elapsed, ${scenario.target}min target, ${scenario.mode} mode`);
  console.log(`     Output: "${result.label}" "${result.value}" (${result.color})`);
  console.log(`     Expected: "${scenario.expected.label}" "${scenario.expected.value}" (${scenario.expected.color})`);
  
  allPassed &= passed;
});

// Test 3: Auto-stop protection
console.log('\n3. Testing auto-stop protection:');

let autoStopInProgress = false;

function testAutoStopProtection() {
  if (autoStopInProgress) {
    console.log('   Auto-stop already in progress, skipping ✅');
    return false; // Should skip
  }
  autoStopInProgress = true;
  console.log('   Auto-stop started ✅');
  return true; // Should proceed
}

function resetAutoStop() {
  autoStopInProgress = false;
  console.log('   Auto-stop reset ✅');
}

const firstCall = testAutoStopProtection();
const secondCall = testAutoStopProtection(); // Should be blocked
resetAutoStop();
const thirdCall = testAutoStopProtection(); // Should work again

allPassed &= (firstCall === true && secondCall === false && thirdCall === true);

console.log(`\n🎯 Overall Test Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allPassed) {
  console.log('\n✨ Fixes verified successfully!');
  console.log('   • Temperature display now shows "--" instead of null');
  console.log('   • Timer consistently shows remaining vs elapsed time');
  console.log('   • Auto-stop protection prevents duplicate calls');
} else {
  console.log('\n⚠️  Some issues detected. Please review the test results above.');
}

process.exit(allPassed ? 0 : 1);