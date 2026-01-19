const { z } = require("zod");

// -------- CREATE PROJECT --------
const createProjectSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(2).max(100)
});

// -------- DECISION API --------
const decisionSchema = z.object({
  game_id: z.string(),
  player_id: z.string(),
  session_id: z.string(),
  playtime: z.number().nonnegative(),
  deaths: z.number().int().nonnegative(),
  restarts: z.number().int().nonnegative(),
  early_quit: z.boolean()
});

module.exports = {
  createProjectSchema,
  decisionSchema
};
