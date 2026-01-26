const express = require("express");
const router = express.Router();

/**
 * Dashboard APIs
 * READ ONLY
 */

module.exports = ({ supabase }) => {

  // 1️⃣ Overview metrics
  router.get("/overview", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("decision_logs")
        .select("decision, risk_score, trend")
        .eq("game_id", req.game_id);

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
              data.reduce((a, b) => a + b.risk_score, 0) / total
            );

      res.json({
        total_decisions: total,
        avg_risk: avgRisk,
        decisions
      });

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Dashboard overview failed" });
    }
  });

  // 2️⃣ Recent decisions
  router.get("/recent", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("decision_logs")
        .select("created_at, decision, risk_score, confidence, trend")
        .eq("game_id", req.game_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Recent decisions failed" });
    }
  });

  // 3️⃣ Top risks / insights
  router.get("/risks", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("meta")
        .eq("game_id", req.game_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const risks = {};

      data.forEach(log => {
        const input = log.meta?.input;
        if (!input) return;

        if (input.early_quit) risks.early_quit = (risks.early_quit || 0) + 1;
        if (input.deaths > 3) risks.high_deaths = (risks.high_deaths || 0) + 1;
      });

      res.json(risks);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Risk analysis failed" });
    }
  });

  return router;
};
