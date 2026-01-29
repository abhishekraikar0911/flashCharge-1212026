require('dotenv').config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const chargersRoutes = require("./routes/chargers");
const transactionsRoutes = require("./routes/transactions");
const authRoutes = require("./routes/auth");
const prepaidRoutes = require("./routes/prepaid");
const firmwareRoutes = require("./routes/firmware");
const { getStats } = require('./services/websocket');

const app = express();
const PORT = process.env.PORT || 3000;
const http = require('http');
const { initWebSocket, startMonitoring } = require('./services/websocket');

const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8081', 'https://ocpp.rivotmotors.com'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "Dashboard backend running" });
});

app.get("/api/ws/stats", (req, res) => {
  res.json(getStats());
});

app.use("/api/auth", authRoutes);
app.use("/api/chargers", chargersRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/prepaid", prepaidRoutes);
app.use("/api/firmware", firmwareRoutes);

// Serve firmware files
app.use('/firmware', express.static('/opt/ev-platform/firmware-storage'));

initWebSocket(server);
startMonitoring();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Dashboard backend running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});

