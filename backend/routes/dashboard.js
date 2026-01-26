const express = require("express");
const router = express.Router();

/**
 * Dashboard APIs
 * READ ONLY
 * Operator visibility layer
 */

module.exports = ({ supabase }) => {

  /**
   * 1️⃣ Overview (system level)
   */
  router.get("/overview", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("decision_logs")
        .select("decision, risk_score, confidence, source");

      if (error) throw error;

      const total = data.length;

      const decisions = {
        GO: data.filter(d => d.decision === "GO").length,
        ITERATE: data.filter(d => d.decision === "ITERATE").length,
        KILL: data.filter(d => d.decision === "KILL").length
      };

      const avgRisk =
        total === 0
          ? 0
          : Math.round(
              data.reduce((a, b) => a + (b.risk_score || 0), 0) / total
            );

      const avgConfidence =
        total === 0
          ? 0
          : Number(
              (
                data.reduce((a, b) => a + (b.confidence || 0), 0) / total
              ).toFixed(2)
            );

      res.json({
        total_decisions: total,
        avg_risk: avgRisk,
        avg_confidence: avgConfidence,
        decisions
      });
    } catch (e) {
      console.error("Dashboard overview error:", e);
      res.status(500).json({ error: "Dashboard overview failed" });
    }
  });

  /**
   * 2️⃣ Recent decisions (latest 20)
   */
  router.get("/recent", async (_, res) => {
    try {
      const { data, error } = await supabase
        .from("decision_logs")
        .select(
          "created_at, game_id, decision, risk_score, confidence, source, trend"
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      res.json(data || []);
    } catch (e) {
      console.error("Recent decisions error:", e);
      res.status(500).json({ error: "Recent decisions failed" });
    }
  });

  /**
   * 3️⃣ Per-game history
   */
  router.get("/history/:game_id", async (req, res) => {
    const { game_id } = req.params;

    try {
      const { data, error } = await supabase
        .from("decision_logs")
        .select(
          "created_at, decision, risk_score, confidence, source, trend"
        )
        .eq("game_id", game_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      res.json(data || []);
    } catch (e) {
      console.error("History error:", e);
      res.status(500).json({ error: "History fetch failed" });
    }
  });

  /**
   * 4️⃣ Top risk signals (aggregated)
   */
  router.get("/risks", async (_, res) => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("meta")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const risks = {};

      for (const log of data || []) {
        const input = log?.meta?.input;
        if (!input) continue;

        if (input.early_quit)
          risks.early_quit = (risks.early_quit || 0) + 1;

        if (input.deaths >= 3)
          risks.high_deaths = (risks.high_deaths || 0) + 1;

        if (input.playtime < 60)
          risks.low_playtime = (risks.low_playtime || 0) + 1;
      }

      res.json(risks);
    } catch (e) {
      console.error("Risk aggregation error:", e);
      res.status(500).json({ error: "Risk analysis failed" });
    }
  });

  return router;
};
