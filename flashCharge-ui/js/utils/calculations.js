import { BATTERY, PRICING } from './constants.js';

export function calculateFromRange(targetKm, params) {
  const rangeToAdd = targetKm - params.currentRangeKm;
  if (rangeToAdd <= 0) return null;
  
  const ahNeeded = rangeToAdd / BATTERY.RANGE_PER_AH;
  const finalAh = Math.min(params.currentAh + ahNeeded, params.maxCapacityAh * (BATTERY.FULL_SOC / 100));
  const actualAhNeeded = finalAh - params.currentAh;
  
  const finalSOC = (finalAh / params.maxCapacityAh) * 100;
  const energykWh = (actualAhNeeded * BATTERY.NOMINAL_VOLTAGE) / 1000;
  const timeMin = (actualAhNeeded / params.chargingCurrent) * 60;
  const cost = energykWh * PRICING.PER_KWH;
  
  return { 
    energykWh, 
    timeMin, 
    finalSOC, 
    finalRange: params.currentRangeKm + (actualAhNeeded * BATTERY.RANGE_PER_AH), 
    cost 
  };
}

export function calculateFromTime(targetMin, params) {
  const ahDelivered = (params.chargingCurrent * targetMin) / 60;
  const finalAh = Math.min(params.currentAh + ahDelivered, params.maxCapacityAh * (BATTERY.FULL_SOC / 100));
  const actualAhDelivered = finalAh - params.currentAh;
  
  const finalSOC = (finalAh / params.maxCapacityAh) * 100;
  const rangeAdded = actualAhDelivered * BATTERY.RANGE_PER_AH;
  const finalRange = params.currentRangeKm + rangeAdded;
  const energykWh = (actualAhDelivered * BATTERY.NOMINAL_VOLTAGE) / 1000;
  const cost = energykWh * PRICING.PER_KWH;
  
  return { energykWh, timeMin: targetMin, finalSOC, finalRange, cost };
}

export function calculateFromAmount(targetRupees, params) {
  const energykWh = targetRupees / PRICING.PER_KWH;
  const ahDelivered = (energykWh * 1000) / BATTERY.NOMINAL_VOLTAGE;
  const finalAh = Math.min(params.currentAh + ahDelivered, params.maxCapacityAh * (BATTERY.FULL_SOC / 100));
  const actualAhDelivered = finalAh - params.currentAh;
  
  const finalSOC = (finalAh / params.maxCapacityAh) * 100;
  const rangeAdded = actualAhDelivered * BATTERY.RANGE_PER_AH;
  const finalRange = params.currentRangeKm + rangeAdded;
  const actualEnergy = (actualAhDelivered * BATTERY.NOMINAL_VOLTAGE) / 1000;
  const actualCost = actualEnergy * PRICING.PER_KWH;
  const timeMin = (actualAhDelivered / params.chargingCurrent) * 60;
  
  return { energykWh: actualEnergy, timeMin, finalSOC, finalRange, cost: actualCost };
}

export function calculateFull(params) {
  const targetAh = params.maxCapacityAh * (BATTERY.FULL_SOC / 100);
  const ahNeeded = targetAh - params.currentAh;
  
  if (ahNeeded <= 0) {
    return { alreadyFull: true };
  }
  
  const finalSOC = BATTERY.FULL_SOC;
  const rangeAdded = ahNeeded * BATTERY.RANGE_PER_AH;
  const finalRange = params.currentRangeKm + rangeAdded;
  const energykWh = (ahNeeded * BATTERY.NOMINAL_VOLTAGE) / 1000;
  const timeMin = (ahNeeded / params.chargingCurrent) * 60;
  const cost = energykWh * PRICING.PER_KWH;
  
  return { energykWh, timeMin, finalSOC, finalRange, cost };
}

export function calculateCurrentCost(energyWh) {
  return (energyWh / 1000) * PRICING.PER_KWH;
}
