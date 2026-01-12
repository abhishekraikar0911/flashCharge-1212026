const express = require("express");
const router = express.Router();
const { steveApiClient } = require("../services/steveService");

// GET ALL TRANSACTIONS
router.get("/", async (req, res) => {
  try {
    const response = await steveApiClient.get("/transactions");
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
