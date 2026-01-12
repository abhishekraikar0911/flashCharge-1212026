import { state } from "../core/state.js";
import { updateDashboard } from "../ui/dashboard.js";
import { updateWizard } from "../wizard/wizard.js";
import { checkSafety } from "./safety.js";

export function handleTelemetry(d) {
  state.latestData = d;

  // Access the data field
  const data = d.data || d; // Fallback if no data field

  const volt = Number(data.TerminalVolt || 0);
  const curr = Number(data.TerminalCurr || 0);
  const soc  = Number(data.SoC || 0);
  const energy = Number(data.TerminalEnergy || 0) / 1000;

  state.currentSoc = soc;

  updateWizard(volt > 50, Number(data.BMS_Imax || 0), soc);
  updateDashboard({ volt, curr, soc, energy });

  checkSafety(volt);
}

