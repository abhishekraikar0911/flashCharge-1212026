let socket;
let pending = [];

export function connectWs() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.hostname}:81/dashboard`;

  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log('WebSocket connected');
    pending.forEach(a => socket.send(JSON.stringify({ action: a })));
    pending = [];
  };

  socket.onmessage = e => {
    console.log('Received:', e.data);
  };

  socket.onclose = () => {
    console.log('WebSocket closed, reconnecting...');
    setTimeout(connectWs, 2000);
  };

  window.ws = socket; // Make it global for app.js
}

export function sendAction(action) {
  if (socket && socket.readyState === 1)
    socket.send(JSON.stringify({ action }));
  else
    pending.push(action);
}

