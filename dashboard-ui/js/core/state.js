export const state = {
  currentState: 0,
  detectedModel: null,
  currentSoc: 0,
  smartActive: false,
  isAuthorized: false,

  sessionStartTime: 0,
  sessionStartEnergy: 0,
  sessionEndEnergy: 0,

  calculatedLimit: { energy: 0, timeMinutes: 0, targetSoc: 0 },

  latestData: {},
};

