const express = require("express");
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { steveApiClient } = require("../services/steveService");

// GET ALL TRANSACTIONS
router.get("/", authenticateToken, async (req, res) => {
  try {
    const response = await steveApiClient.get("/api/v1/transactions");
    res.json(response.data);
  } catch (err) {
    console.error("SteVe API error:", err.message);
    res.status(500).json({
      error: "Failed to fetch transactions",
      details: err.message,
    });
  }
});

module.exports = router;
