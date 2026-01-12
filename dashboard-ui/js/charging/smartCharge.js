import { state } from "../core/state.js";
import { SOC_CAP } from "../core/config.js";

export function calculateLimits(currentSoc, packKwh, powerKw) {
  let neededKwh = ((SOC_CAP - currentSoc) / 100) * packKwh;
  let timeMin = (neededKwh / powerKw) * 60;

  state.calculatedLimit = {
    energy: neededKwh,
    timeMinutes: timeMin,
    targetSoc: SOC_CAP
  };
}

