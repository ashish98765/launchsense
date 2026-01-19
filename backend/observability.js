// Observability & Soft Alert Engine
// Phase-4 Batch-1

const metrics = {
  requests: 0,
  errors: 0,
  decisions: {
    GO: 0,
    ITERATE: 0,
    KILL: 0,
    REVIEW: 0
  },
  slow_requests: 0,
  last_reset: Date.now()
};

// Middleware to track request latency & errors
function observabilityMiddleware(req, res, next) {
  const start = Date.now();
  metrics.requests++;

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (duration > 1500) {
      metrics.slow_requests++;
    }

    if (res.statusCode >= 500) {
      metrics.errors++;
    }
  });

  next();
}

// Track decisions (called manually from server.js later)
function trackDecision(decision) {
  if (metrics.decisions[decision] !== undefined) {
    metrics.decisions[decision]++;
  }
}

// Soft alert logic (NO blocking)
function getAlerts() {
  const alerts = [];

  const errorRate =
    metrics.requests > 0
      ? metrics.errors / metrics.requests
      : 0;

  if (errorRate > 0.05) {
    alerts.push({
      type: "HIGH_ERROR_RATE",
      value: Number((errorRate * 100).toFixed(2)) + "%"
    });
  }

  if (metrics.slow_requests > 20) {
    alerts.push({
      type: "LATENCY_DEGRADATION",
      count: metrics.slow_requests
    });
  }

  if (metrics.decisions.KILL > metrics.decisions.GO * 3) {
    alerts.push({
      type: "KILL_DOMINANCE",
      note: "Too many KILL decisions compared to GO"
    });
  }

  return alerts;
}

// Admin-readable snapshot
function getObservabilitySnapshot() {
  return {
    uptime_minutes: Math.round((Date.now() - metrics.last_reset) / 60000),
    requests: metrics.requests,
    errors: metrics.errors,
    slow_requests: metrics.slow_requests,
    decisions: metrics.decisions,
    alerts: getAlerts()
  };
}

module.exports = {
  observabilityMiddleware,
  trackDecision,
  getObservabilitySnapshot
};
