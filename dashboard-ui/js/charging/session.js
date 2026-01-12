import { state } from "../core/state.js";
import { sendAction } from "../ws/socket.js";

export function startSession() {
  state.sessionStartTime = Date.now();
  state.sessionStartEnergy = Number(state.latestData.TerminalEnergy || 0) / 1000;
  sendAction("RemoteStart");
}

export function stopSession() {
  sendAction("RemoteStop");
}

