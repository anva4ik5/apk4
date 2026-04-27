import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";
import type { LoginPayload, RegisterPayload } from "@gta-rp/shared";
import { config } from "../config.js";
import { pool } from "../db.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = registerSchema;

function signToken(userId: number): string {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: "7d"
  });
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body satisfies RegisterPayload);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [parsed.data.email.toLowerCase(), passwordHash]
    );
    const token = signToken(result.rows[0].id);
    return res.status(201).json({ token, userId: result.rows[0].id });
  } catch (error) {
    return res.status(409).json({ message: "Email already exists" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body satisfies LoginPayload);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const userResult = await pool.query<{
    id: number;
    password_hash: string;
  }>(`SELECT id, password_hash FROM users WHERE email = $1`, [
    parsed.data.email.toLowerCase()
  ]);

  if (userResult.rowCount === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = userResult.rows[0];
  const passwordOk = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user.id);
  return res.json({ token, userId: user.id });
});
