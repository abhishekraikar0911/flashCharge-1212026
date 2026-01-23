const db = require('./db');
const { getVariantByCurrentOffered, calculateCurrentAh, calculateRange } = require('../utils/batteryCalculations');
const { BATTERY, PRICING } = require('../config/constants');

async function getChargingParameters(chargeBoxId) {
  const [rows] = await db.query(`
    SELECT 
      cmv.measurand,
      cmv.value
    FROM connector_meter_value cmv
    JOIN connector c ON c.connector_pk = cmv.connector_pk
    WHERE c.charge_box_id = ?
      AND cmv.measurand IN ('SoC', 'Voltage', 'Current.Offered')
    ORDER BY cmv.value_timestamp DESC
    LIMIT 10
  `, [chargeBoxId]);

  let soc = 0, voltage = BATTERY.NOMINAL_VOLTAGE, currentOffered = 30;
  
  for (const row of rows) {
    if (row.measurand === 'SoC' && soc === 0) soc = parseFloat(row.value);
    if (row.measurand === 'Voltage' && voltage === BATTERY.NOMINAL_VOLTAGE) voltage = parseFloat(row.value);
    if (row.measurand === 'Current.Offered' && currentOffered === 30) currentOffered = parseFloat(row.value);
  }

  const variant = getVariantByCurrentOffered(currentOffered);
  const currentAh = calculateCurrentAh(soc, variant.capacityAh);
  const currentRangeKm = calculateRange(currentAh);

  return {
    variant: variant.name,
    currentSOC: parseFloat(soc.toFixed(2)),
    currentAh: parseFloat(currentAh.toFixed(2)),
    maxCapacityAh: variant.capacityAh,
    currentRangeKm: parseFloat(currentRangeKm.toFixed(1)),
    maxRangeKm: variant.maxRangeKm,
    voltage: parseFloat(voltage.toFixed(1)),
    chargingCurrent: currentOffered,
    pricing: PRICING.PER_KWH,
    nominalVoltage: BATTERY.NOMINAL_VOLTAGE
  };
}

module.exports = {
  getChargingParameters
};
