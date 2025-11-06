// server/routes/companion.js
const express = require("express");
const { analyzeStage1 } = require("../utils/stage1Analyzer.js");

const router = express.Router();

router.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    const result = await analyzeStage1(text);
    res.json(result);
  } catch (err) {
    console.error("❌ Stage 1 analysis failed:", err);
    res.status(500).json({ error: "Stage 1 analysis failed" });
  }
});

module.exports = router;
