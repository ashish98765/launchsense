const express = require("express");
const router = express.Router();

module.exports = (supabase) => {
  // GET all rules
  router.get("/", async (_, res) => {
    const { data } = await supabase
      .from("decision_rules")
      .select("*")
      .order("priority", { ascending: false });
    res.json(data);
  });

  // CREATE rule
  router.post("/", async (req, res) => {
    const { rule_key, min_value, max_value, decision, priority } = req.body;
    const { data, error } = await supabase.from("decision_rules").insert({
      rule_key,
      min_value,
      max_value,
      decision,
      priority,
      active: true
    });
    res.json({ data, error });
  });

  // TOGGLE rule
  router.patch("/:id/toggle", async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;
    const { data } = await supabase
      .from("decision_rules")
      .update({ active })
      .eq("id", id);
    res.json(data);
  });

  return router;
};
