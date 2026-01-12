const express = require("express");
const cors = require("cors");

const chargersRoutes = require("./routes/chargers");
const transactionsRoutes = require("./routes/transactions");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Dashboard backend running" });
});

// ROUTES (THIS WAS MISSING OR WRONG)
app.use("/api/chargers", chargersRoutes);
app.use("/api/transactions", transactionsRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dashboard backend running on port ${PORT}`);
});

