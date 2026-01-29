// Battery and charging constants
module.exports = {
  BATTERY: {
    NOMINAL_VOLTAGE: 73.6,
    MIN_VOLTAGE: 58,
    MAX_VOLTAGE: 84.5,
    FULL_VOLTAGE: 82,
    FULL_SOC: 90,
    RANGE_PER_AH: 2.8,
    CELL_CONFIG: '23S LFP'
  },
  
  VARIANTS: {
    CLASSIC: {
      name: 'Classic',
      maxCurrent: 30,
      capacityAh: 30,
      maxRangeKm: 84
    },
    PRO: {
      name: 'Pro',
      maxCurrent: 60,
      capacityAh: 60,
      maxRangeKm: 168
    },
    MAX: {
      name: 'Max',
      maxCurrent: 100,
      capacityAh: 90,
      maxRangeKm: 252
    }
  },
  
  PRICING: {
    PER_KWH: 15.00,
    CURRENCY: 'INR',
    SYMBOL: '₹'
  },
  
  CHARGING: {
    MIN_RANGE_KM: 10,
    MIN_TIME_MIN: 5,
    MAX_TIME_MIN: 120,
    MIN_AMOUNT: 5,
    MAX_AMOUNT: 50
  }
};
