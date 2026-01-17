const API = "/api";
const chargerId = "RIVOT_100A_01";

let selectedConnectorId = 1; // Fixed to connector 1

/* ---------------------------
   Connector status (real OCPP status)
---------------------------- */
async function refreshStatus() {
  try {
    const res = await fetch(`${API}/api/chargers/${chargerId}/connectors/${selectedConnectorId}`);
    const data = await res.json();

    document.getElementById("status").innerText = data.status || "Unknown";

    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");

    if (data.status === "Charging") {
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  } catch {
    document.getElementById("status").innerText = "Error";
  }
}

/* ---------------------------
   SOC
---------------------------- */
async function refreshSOC() {
  const res = await fetch(`${API}/api/chargers/${chargerId}/soc`);
  const data = await res.json();
  const socValue = data.soc !== null ? data.soc : 0;
  updateGauge(socValue);
}

function updateGauge(soc) {
  const ring = document.getElementById("soc-ring");
  const socValueEl = document.getElementById("soc-value");

  const circumference = 534;
  const value = Math.max(0, Math.min(100, soc));
  const offset = circumference - (value / 100) * circumference;

  ring.style.strokeDashoffset = offset;
  socValueEl.innerText = value ? parseFloat(value).toFixed(2) : "--";

  // Glow intensity based on SOC
  ring.style.filter = `drop-shadow(0 0 ${10 + value / 4}px rgba(59,130,246,0.9))`;
}

/* ---------------------------
   Start / Stop
---------------------------- */
document.getElementById("start-btn").onclick = async () => {
  await fetch(`${API}/api/chargers/${chargerId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connectorId: selectedConnectorId,
      idTag: "TEST_TAG"
    })
  });
  // Refresh status after action
  setTimeout(refreshStatus, 1000);
};

document.getElementById("stop-btn").onclick = async () => {
  await fetch(`${API}/api/chargers/${chargerId}/stop`, { method: "POST" });
  // Refresh status after action
  setTimeout(refreshStatus, 1000);
};

/* ---------------------------
   Init
---------------------------- */
window.onload = () => {
  updateGauge(0); // Initialize gauge at 0
  refreshStatus();
  refreshSOC();
  // Refresh status and SOC every 5 seconds
  setInterval(refreshStatus, 5000);
  setInterval(refreshSOC, 5000);
};

