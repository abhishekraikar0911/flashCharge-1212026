const { BATTERY, VARIANTS, PRICING } = require('../config/constants');

function getVariantByCurrentOffered(currentOffered) {
  if (currentOffered <= VARIANTS.CLASSIC.maxCurrent) {
    return VARIANTS.CLASSIC;
  } else if (currentOffered <= VARIANTS.PRO.maxCurrent) {
    return VARIANTS.PRO;
  } else {
    return VARIANTS.MAX;
  }
}

function calculateCurrentAh(soc, maxCapacityAh) {
  return (soc * maxCapacityAh) / 100;
}

function calculateSOC(currentAh, maxCapacityAh) {
  return (currentAh / maxCapacityAh) * 100;
}

function calculateRange(ah) {
  return ah * BATTERY.RANGE_PER_AH;
}

function calculateAhFromRange(rangeKm) {
  return rangeKm / BATTERY.RANGE_PER_AH;
}

function calculateEnergy(ah) {
  return (ah * BATTERY.NOMINAL_VOLTAGE) / 1000;
}

function calculateAhFromEnergy(energykWh) {
  return (energykWh * 1000) / BATTERY.NOMINAL_VOLTAGE;
}

function calculateTime(ah, chargingCurrent) {
  return (ah / chargingCurrent) * 60;
}

function calculateAhFromTime(minutes, chargingCurrent) {
  return (chargingCurrent * minutes) / 60;
}

function calculateCost(energykWh) {
  return energykWh * PRICING.PER_KWH;
}

function calculateEnergyFromCost(cost) {
  return cost / PRICING.PER_KWH;
}

function capAtFullCharge(ah, maxCapacityAh) {
  return Math.min(ah, maxCapacityAh * (BATTERY.FULL_SOC / 100));
}

module.exports = {
  getVariantByCurrentOffered,
  calculateCurrentAh,
  calculateSOC,
  calculateRange,
  calculateAhFromRange,
  calculateEnergy,
  calculateAhFromEnergy,
  calculateTime,
  calculateAhFromTime,
  calculateCost,
  calculateEnergyFromCost,
  capAtFullCharge
};
