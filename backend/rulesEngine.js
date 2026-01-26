// rulesEngine.js
// DB-driven rules evaluator (authoritative override layer)

async function evaluateRules({ supabase, metrics }) {
  const { data: rules, error } = await supabase
    .from("decision_rules")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: true });

  if (error || !rules || rules.length === 0) {
    return null;
  }

  for (const rule of rules) {
    const value = metrics[rule.rule_key];
    if (value === undefined || value === null) continue;

    const minOk =
      rule.min_value === null || value >= rule.min_value;
    const maxOk =
      rule.max_value === null || value <= rule.max_value;

    if (minOk && maxOk) {
      return {
        decision: rule.decision,
        matched_rule: rule.rule_key,
        value,
        range: [rule.min_value, rule.max_value],
        priority: rule.priority,
        description: rule.description || null,
        source: "DB_RULE"
      };
    }
  }

  return null;
}

module.exports = { evaluateRules };
