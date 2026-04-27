import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { pool } from "../db.js";

const giveMoneySchema = z.object({
  characterId: z.number().int().positive(),
  amount: z.number().int().min(1).max(500000),
  to: z.enum(["cash", "bank"])
});

const createFactionSchema = z.object({
  name: z.string().min(3).max(64),
  type: z.enum(["government", "crime", "business", "gang"]),
  inviteCode: z.string().min(4).max(32)
});

const addFactionMemberSchema = z.object({
  factionId: z.number().int().positive(),
  characterId: z.number().int().positive(),
  rankCode: z.string().min(2).max(32).default("recruit"),
  isLeader: z.boolean().default(false)
});

const addFactionVehicleSchema = z.object({
  factionId: z.number().int().positive(),
  modelCode: z.string().min(2).max(32),
  plate: z.string().min(3).max(16),
  minRankCode: z.string().min(2).max(32).default("recruit")
});

const upsertFactionRankSchema = z.object({
  factionId: z.number().int().positive(),
  rankCode: z.string().min(2).max(32),
  rankWeight: z.number().int().min(1).max(1000).default(1),
  canInvite: z.boolean().default(false),
  canManageTreasury: z.boolean().default(false),
  canIssueWanted: z.boolean().default(false),
  canArrest: z.boolean().default(false),
  canManageVehicles: z.boolean().default(false),
  canCaptureTerritory: z.boolean().default(false)
});

const catalogVehicleSchema = z.object({
  modelCode: z.string().min(2).max(64),
  displayName: z.string().min(2).max(120),
  brand: z.string().min(1).max(120),
  price: z.number().int().min(0).max(100000000),
  tier: z.enum(["economy", "comfort", "sport", "super", "service", "government", "crime", "premium"]),
  regions: z.array(z.enum(["EU", "RU", "CIS", "DE"])).min(1),
  access: z.array(z.string().min(2).max(32)).min(1),
  minRankCode: z.string().min(2).max(32).optional()
});

const bulkCatalogSchema = z.object({
  items: z.array(catalogVehicleSchema).min(1),
  replaceAll: z.boolean().default(false)
});

export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  const token = req.headers["x-admin-token"];
  if (token !== config.adminToken) return res.status(403).json({ message: "Forbidden" });
  return next();
});

adminRouter.post("/give-money", async (req, res) => {
  const parsed = giveMoneySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const field = parsed.data.to === "cash" ? "money_cash" : "money_bank";
  await pool.query(`UPDATE characters SET ${field} = ${field} + $1 WHERE id = $2`, [
    parsed.data.amount,
    parsed.data.characterId
  ]);
  await pool.query(`INSERT INTO economy_logs (character_id, action, amount) VALUES ($1, $2, $3)`, [
    parsed.data.characterId,
    `admin_give_${parsed.data.to}`,
    parsed.data.amount
  ]);

  return res.status(201).json({ ok: true });
});

adminRouter.post("/factions", async (req, res) => {
  const parsed = createFactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO factions (name, type, invite_code)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [parsed.data.name, parsed.data.type, parsed.data.inviteCode]
    );
    return res.status(201).json({ id: result.rows[0].id });
  } catch {
    return res.status(409).json({ message: "Faction already exists or invite code is not unique" });
  }
});

adminRouter.post("/factions/member", async (req, res) => {
  const parsed = addFactionMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  try {
    await pool.query(
      `INSERT INTO faction_members (faction_id, character_id, rank_code, is_leader, on_duty)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [parsed.data.factionId, parsed.data.characterId, parsed.data.rankCode, parsed.data.isLeader]
    );
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(409).json({ message: "Character is already in faction or invalid faction" });
  }
});

adminRouter.post("/factions/vehicle", async (req, res) => {
  const parsed = addFactionVehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO faction_vehicles (faction_id, model_code, plate, min_rank_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [parsed.data.factionId, parsed.data.modelCode, parsed.data.plate, parsed.data.minRankCode]
    );
    return res.status(201).json({ id: result.rows[0].id });
  } catch {
    return res.status(409).json({ message: "Vehicle plate already exists or faction invalid" });
  }
});

adminRouter.post("/factions/rank", async (req, res) => {
  const parsed = upsertFactionRankSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  await pool.query(
    `INSERT INTO faction_ranks
       (faction_id, rank_code, rank_weight, can_invite, can_manage_treasury, can_issue_wanted, can_arrest, can_manage_vehicles, can_capture_territory)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (faction_id, rank_code)
     DO UPDATE SET
       rank_weight = EXCLUDED.rank_weight,
       can_invite = EXCLUDED.can_invite,
       can_manage_treasury = EXCLUDED.can_manage_treasury,
       can_issue_wanted = EXCLUDED.can_issue_wanted,
       can_arrest = EXCLUDED.can_arrest,
       can_manage_vehicles = EXCLUDED.can_manage_vehicles,
       can_capture_territory = EXCLUDED.can_capture_territory`,
    [
      parsed.data.factionId,
      parsed.data.rankCode,
      parsed.data.rankWeight,
      parsed.data.canInvite,
      parsed.data.canManageTreasury,
      parsed.data.canIssueWanted,
      parsed.data.canArrest,
      parsed.data.canManageVehicles,
      parsed.data.canCaptureTerritory
    ]
  );
  return res.status(201).json({ ok: true });
});

adminRouter.post("/vehicles/catalog/bulk", async (req, res) => {
  const parsed = bulkCatalogSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (parsed.data.replaceAll) {
      await client.query(`DELETE FROM vehicle_catalog_custom`);
    }
    for (const item of parsed.data.items) {
      await client.query(
        `INSERT INTO vehicle_catalog_custom (model_code, data, enabled, updated_at)
         VALUES ($1, $2::jsonb, TRUE, NOW())
         ON CONFLICT (model_code)
         DO UPDATE SET data = EXCLUDED.data, enabled = TRUE, updated_at = NOW()`,
        [item.modelCode, JSON.stringify(item)]
      );
    }
    await client.query("COMMIT");
    return res.status(201).json({ ok: true, upserted: parsed.data.items.length });
  } catch {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: "Catalog bulk import failed" });
  } finally {
    client.release();
  }
});
