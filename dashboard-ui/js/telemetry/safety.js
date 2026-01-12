let lastVoltTime = Date.now();

export function checkSafety(volt) {
  if (volt > 0) lastVoltTime = Date.now();

  if (Date.now() - lastVoltTime > 5000) {
    console.warn("⚠️ Communication lost (Voltage 0)");
  }
}

