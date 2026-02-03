const crypto = require('crypto');

// In-memory session store (30 min expiry)
const sessions = new Map();

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function generateToken(chargerId, connectorId) {
  const token = crypto.randomBytes(32).toString('hex');
  
  sessions.set(token, {
    chargerId,
    connectorId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY_MS
  });
  
  return token;
}

function validateToken(token) {
  const session = sessions.get(token);
  
  if (!session) {
    return { valid: false, reason: 'Invalid token' };
  }
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return { valid: false, reason: 'Token expired' };
  }
  
  return { 
    valid: true, 
    chargerId: session.chargerId,
    connectorId: session.connectorId
  };
}

function refreshToken(token) {
  const session = sessions.get(token);
  
  if (session && Date.now() <= session.expiresAt) {
    session.expiresAt = Date.now() + SESSION_EXPIRY_MS;
    return true;
  }
  
  return false;
}

function invalidateToken(token) {
  return sessions.delete(token);
}

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  generateToken,
  validateToken,
  refreshToken,
  invalidateToken
};
