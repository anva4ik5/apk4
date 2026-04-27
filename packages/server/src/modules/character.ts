import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import type { CreateCharacterPayload } from "@gta-rp/shared";
import { getUserIdFromRequest } from "../auth.js";

const createCharacterSchema = z.object({
  firstName: z.string().min(2).max(24),
  lastName: z.string().min(2).max(24)
});

export const characterRouter = Router();

characterRouter.post("/", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = createCharacterSchema.safeParse(req.body satisfies CreateCharacterPayload);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const result = await pool.query<{
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    money_cash: number;
    money_bank: number;
    created_at: string;
  }>(
    `INSERT INTO characters (user_id, first_name, last_name)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, first_name, last_name, money_cash, money_bank, created_at`,
    [userId, parsed.data.firstName, parsed.data.lastName]
  );

  return res.status(201).json({
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    firstName: result.rows[0].first_name,
    lastName: result.rows[0].last_name,
    moneyCash: result.rows[0].money_cash,
    moneyBank: result.rows[0].money_bank,
    createdAt: result.rows[0].created_at
  });
});

characterRouter.get("/me", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const result = await pool.query<{
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    money_cash: number;
    money_bank: number;
    created_at: string;
  }>(
    `SELECT id, user_id, first_name, last_name, money_cash, money_bank, created_at
       FROM characters WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  if (result.rowCount === 0) return res.status(404).json({ message: "Character not found" });

  return res.json({
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    firstName: result.rows[0].first_name,
    lastName: result.rows[0].last_name,
    moneyCash: result.rows[0].money_cash,
    moneyBank: result.rows[0].money_bank,
    createdAt: result.rows[0].created_at
  });
});
