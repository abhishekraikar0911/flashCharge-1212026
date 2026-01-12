import { state } from "../core/state.js";
import { VEHICLES } from "../core/config.js";

export function resetWizard() {
  state.currentState = 0;
}

export function updateWizard(connected, imax, soc) {
  if (!connected) return;

  const vehicle =
    imax <= 13 ? VEHICLES[0] :
    imax > 20 ? VEHICLES[2] :
    VEHICLES[1];

  state.detectedModel = vehicle;
  state.currentSoc = soc;
}

