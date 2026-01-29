const db = require('./db');
const cache = require('./cache');

async function getSOCData(chargeBoxId) {
  const cacheKey = `soc:${chargeBoxId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) return cached;

  const [rows] = await db.query(`
    SELECT 
      cs.status,
      dt.data as datatransfer_data,
      dt.received_at as dt_timestamp,
      cmv_soc.value as soc,
      cmv_voltage.value as voltage,
      cmv_current_import.value as current_import,
      cmv_power.value as power,
      cmv_current_offered.value as current_offered,
      t.start_timestamp,
      t.transaction_pk
    FROM connector c
    LEFT JOIN connector_status cs ON cs.connector_pk = c.connector_pk
      AND cs.status_timestamp = (
        SELECT MAX(cs2.status_timestamp)
        FROM connector_status cs2
        WHERE cs2.connector_pk = c.connector_pk
      )
    LEFT JOIN data_transfer dt ON dt.charge_box_id = c.charge_box_id 
      AND dt.message_id = 'PreChargeData'
      AND dt.received_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
    LEFT JOIN connector_meter_value cmv_soc ON cmv_soc.connector_pk = c.connector_pk
      AND cmv_soc.measurand = 'SoC'
      AND cmv_soc.value_timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    LEFT JOIN connector_meter_value cmv_voltage ON cmv_voltage.connector_pk = c.connector_pk
      AND cmv_voltage.measurand = 'Voltage'
      AND cmv_voltage.value_timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    LEFT JOIN connector_meter_value cmv_current_import ON cmv_current_import.connector_pk = c.connector_pk
      AND cmv_current_import.measurand = 'Current.Import'
      AND cmv_current_import.value_timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    LEFT JOIN connector_meter_value cmv_power ON cmv_power.connector_pk = c.connector_pk
      AND cmv_power.measurand = 'Power.Active.Import'
      AND cmv_power.value_timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    LEFT JOIN connector_meter_value cmv_current_offered ON cmv_current_offered.connector_pk = c.connector_pk
      AND cmv_current_offered.measurand = 'Current.Offered'
      AND cmv_current_offered.value_timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    LEFT JOIN transaction t ON t.connector_pk = c.connector_pk 
      AND t.stop_timestamp IS NULL
    WHERE c.charge_box_id = ? AND c.connector_id = 1
    ORDER BY dt.received_at DESC
    LIMIT 1
  `, [chargeBoxId]);

  if (!rows.length) {
    return {
      soc: 0,
      voltage: "0.0 V",
      current: "0.0 A",
      power: "0.00 kW",
      energy: "0.00 Wh",
      temperature: null,
      model: "--",
      currentRangeKm: "--",
      maxRangeKm: "--",
      isCharging: false
    };
  }

  const data = rows[0];
  const status = data.status || 'Available';
  const isCharging = status === 'Charging';

  // Check DataTransfer first
  if (data.datatransfer_data) {
    const preChargeData = JSON.parse(data.datatransfer_data);
    const soc = preChargeData.soc || 0;
    const voltage = preChargeData.voltage || 0;
    const temperature = preChargeData.temperature || null;
    
    let model = preChargeData.model || "Classic";
    let currentRangeKm = preChargeData.range || 0;
    
    if (!preChargeData.model && preChargeData.maxCurrent) {
      const maxCurrent = preChargeData.maxCurrent;
      if (maxCurrent <= 30) model = 'Classic';
      else if (maxCurrent <= 60) model = 'Pro';
      else model = 'Max';
    }
    
    if (!preChargeData.range) {
      const maxRange = model === 'Classic' ? 84 : (model === 'Pro' ? 168 : 252);
      currentRangeKm = (soc / 100) * maxRange;
    }
    
    const maxRangeKm = model === 'Classic' ? 81 : (model === 'Pro' ? 162 : 243);

    const result = {
      soc: parseFloat(soc.toFixed(2)),
      voltage: `${parseFloat(voltage).toFixed(1)} V`,
      current: "0.0 A",
      power: "0.00 kW",
      energy: "0.00 Wh",
      temperature,
      model,
      currentRangeKm: parseFloat(currentRangeKm).toFixed(1),
      maxRangeKm,
      isCharging,
      dataSource: 'datatransfer'
    };
    
    cache.set(cacheKey, result, 5);
    return result;
  }

  // Fallback to MeterValues
  let soc = data.soc ? parseFloat(data.soc) : 0;
  let voltage = data.voltage ? parseFloat(data.voltage).toFixed(1) : "0.0";
  let current = data.current_import ? parseFloat(data.current_import).toFixed(1) : "0.0";
  let power = data.power ? (parseFloat(data.power) / 1000).toFixed(2) : "0.00";
  
  let energy = 0;
  if (isCharging && data.start_timestamp) {
    const startTime = new Date(data.start_timestamp);
    const durationHours = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
    energy = (parseFloat(power) * durationHours * 1000).toFixed(2);
  }

  let model = "NX-100 CLASSIC", maxRangeKm = 84;
  if (data.current_offered) {
    const currentOffered = parseFloat(data.current_offered);
    if (currentOffered >= 31 && currentOffered <= 60) {
      model = "NX-100 PRO";
      maxRangeKm = 168;
    } else if (currentOffered >= 61) {
      model = "NX-100 MAX";
      maxRangeKm = 252;
    }
  }

  const currentRangeKm = soc ? ((maxRangeKm * soc) / 100).toFixed(1) : "0.0";

  const result = {
    soc,
    voltage: `${voltage} V`,
    current: `${current} A`,
    power: `${power} kW`,
    energy: `${energy} Wh`,
    temperature: null,
    model,
    currentRangeKm,
    maxRangeKm,
    isCharging,
    dataSource: 'metervalues'
  };

  cache.set(cacheKey, result, 5);
  return result;
}

module.exports = { getSOCData };
