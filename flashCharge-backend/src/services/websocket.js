const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const db = require('./db');

let wss = null;
const clients = new Map();
const connectionStats = new Map();
const rateLimits = new Map();

function initWebSocket(server) {
  wss = new WebSocket.Server({ 
    server, 
    path: '/ws',
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      }
    }
  });
  
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const chargerId = url.searchParams.get('charger');
    const token = url.searchParams.get('token');
    const ip = req.socket.remoteAddress;
    
    const now = Date.now();
    if (!rateLimits.has(ip)) rateLimits.set(ip, []);
    const connections = rateLimits.get(ip).filter(t => now - t < 60000);
    connections.push(now);
    rateLimits.set(ip, connections);
    
    if (connections.length > 50) {
      ws.close(4003, 'Too many connections');
      return;
    }
    
    if (!chargerId) {
      ws.close(4000, 'Charger ID required');
      return;
    }
    
    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }
    
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      ws.close(4002, 'Invalid token');
      return;
    }
    
    if (!clients.has(chargerId)) {
      clients.set(chargerId, new Set());
    }
    clients.get(chargerId).add(ws);
    
    connectionStats.set(ws, {
      chargerId,
      connectedAt: now,
      messagesSent: 0,
      lastActivity: now
    });
    
    ws.isAlive = true;
    ws.on('pong', () => { 
      ws.isAlive = true;
      const stats = connectionStats.get(ws);
      if (stats) stats.lastActivity = Date.now();
    });
    
    ws.on('close', () => {
      const chargerClients = clients.get(chargerId);
      if (chargerClients) {
        chargerClients.delete(ws);
        if (chargerClients.size === 0) {
          clients.delete(chargerId);
        }
      }
      connectionStats.delete(ws);
    });
  });
  
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        connectionStats.delete(ws);
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
}

function broadcast(chargerId, data) {
  const chargerClients = clients.get(chargerId);
  if (!chargerClients) return;
  
  const message = JSON.stringify(data);
  chargerClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      const stats = connectionStats.get(ws);
      if (stats) {
        stats.messagesSent++;
        stats.lastActivity = Date.now();
      }
    }
  });
}

function getStats() {
  const stats = {
    activeConnections: wss ? wss.clients.size : 0,
    clientsByCharger: [],
    totalMessagesSent: 0
  };
  
  clients.forEach((clientSet, chargerId) => {
    stats.clientsByCharger.push({
      chargerId,
      clients: clientSet.size
    });
  });
  
  connectionStats.forEach(stat => {
    stats.totalMessagesSent += stat.messagesSent;
  });
  
  return stats;
}

async function startMonitoring() {
  console.log('WebSocket monitoring disabled - queries too slow');
  // Monitoring disabled due to slow MySQL queries blocking event loop
  // Data now comes from VehicleInfo (DataTransfer) every ~5s from firmware
  // Frontend uses REST API polling as fallback
}

module.exports = { initWebSocket, broadcast, startMonitoring, getStats };
