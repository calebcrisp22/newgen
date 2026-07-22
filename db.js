import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import process from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(process.env.DATA_DIR || "/data", "bot.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credentials TEXT NOT NULL,
    username TEXT,
    level INTEGER,
    linked_platforms TEXT,
    renown INTEGER,
    r6credits INTEGER,
    black_ices TEXT,
    elites TEXT,
    universals TEXT,
    ranked_history TEXT,
    skin_link TEXT,
    tier TEXT NOT NULL DEFAULT 'free',
    is_used INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    granted_by TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    guild_id TEXT PRIMARY KEY,
    gen_channel_id TEXT,
    drop_channel_id TEXT,
    cooldown_seconds INTEGER NOT NULL DEFAULT 30,
    premium_cooldown_seconds INTEGER NOT NULL DEFAULT 60,
    drop_cooldown_seconds INTEGER NOT NULL DEFAULT 0,
    banner_image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS invites (
    invite_code TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    uses INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS vouches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS cooldowns (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    command TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, guild_id, command)
  );
`);

// ── Migrations ────────────────────────────────────────────────────────────────
// Add banner_image_url column to settings table if it doesn't already exist
// (for databases created before this column was introduced).
const settingsColumns = db.prepare("PRAGMA table_info(settings)").all();
if (!settingsColumns.some((col) => col.name === "banner_image_url")) {
  db.exec("ALTER TABLE settings ADD COLUMN banner_image_url TEXT");
}

// ── Stock helpers ─────────────────────────────────────────────────────────────

export function getStockCount(tier = "free") {
  return db
    .prepare("SELECT COUNT(*) as count FROM stock WHERE tier = ? AND is_used = 0")
    .get(tier).count;
}

export function popAccount(tier = "free") {
  const row = db
    .prepare("SELECT * FROM stock WHERE tier = ? AND is_used = 0 ORDER BY id ASC LIMIT 1")
    .get(tier);
  if (!row) return null;
  db.prepare("UPDATE stock SET is_used = 1 WHERE id = ?").run(row.id);
  return row;
}

export function addAccount(data) {
  const stmt = db.prepare(`
    INSERT INTO stock
      (credentials, username, level, linked_platforms, renown, r6credits,
       black_ices, elites, universals, ranked_history, skin_link, tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    data.credentials,
    data.username ?? null,
    data.level ?? null,
    data.linkedPlatforms ? JSON.stringify(data.linkedPlatforms) : null,
    data.renown ?? null,
    data.r6credits ?? null,
    data.blackIces ? JSON.stringify(data.blackIces) : null,
    data.elites ? JSON.stringify(data.elites) : null,
    data.universals ? JSON.stringify(data.universals) : null,
    data.rankedHistory ? JSON.stringify(data.rankedHistory) : null,
    data.skinLink ?? null,
    data.tier ?? "free"
  );
}

export function getAccountById(id) {
  return db.prepare("SELECT * FROM stock WHERE id = ?").get(id);
}

export function deleteAccountById(id) {
  return db.prepare("DELETE FROM stock WHERE id = ?").run(id);
}

export function listAccounts(tier = "free", limit = 10) {
  return db
    .prepare("SELECT * FROM stock WHERE tier = ? AND is_used = 0 ORDER BY id ASC LIMIT ?")
    .all(tier, limit);
}

// ── Drop stock helpers ────────────────────────────────────────────────────────

export function getDropStockCount() {
  return db
    .prepare("SELECT COUNT(*) as count FROM stock WHERE tier = 'drop' AND is_used = 0")
    .get().count;
}

export function addDropAccount(data) {
  return addAccount({ ...data, tier: "drop" });
}

export function popDropAccount() {
  return popAccount("drop");
}

// ── Subscription helpers ──────────────────────────────────────────────────────

export function getSubscription(userId, guildId) {
  return db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ? AND guild_id = ?")
    .get(userId, guildId);
}

export function upsertSubscription(userId, guildId, expiresAt, grantedBy) {
  db.prepare(`
    INSERT INTO subscriptions (user_id, guild_id, expires_at, granted_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET
      expires_at = MAX(expires_at, excluded.expires_at),
      granted_by = excluded.granted_by
  `).run(userId, guildId, expiresAt, grantedBy);
}

export function hasActiveSub(userId, guildId) {
  const sub = getSubscription(userId, guildId);
  return sub && sub.expires_at > Math.floor(Date.now() / 1000);
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export function getSettings(guildId) {
  return (
    db.prepare("SELECT * FROM settings WHERE guild_id = ?").get(guildId) ?? {
      guild_id: guildId,
      gen_channel_id: null,
      drop_channel_id: null,
      cooldown_seconds: 30,
      premium_cooldown_seconds: 60,
      drop_cooldown_seconds: 0,
      banner_image_url: null,
    }
  );
}

export function setSetting(guildId, key, value) {
  // Allowlist to prevent SQL injection
  const allowed = [
    "gen_channel_id",
    "drop_channel_id",
    "cooldown_seconds",
    "premium_cooldown_seconds",
    "drop_cooldown_seconds",
    "banner_image_url",
  ];
  if (!allowed.includes(key)) throw new Error(`Unknown setting key: ${key}`);

  db.prepare(`
    INSERT INTO settings (guild_id, ${key}) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET ${key} = excluded.${key}
  `).run(guildId, value);
}

// ── Banner Image helpers ──────────────────────────────────────────────────────

export function getBannerImageUrl(guildId) {
  return getSettings(guildId).banner_image_url ?? null;
}

export function setBannerImageUrl(guildId, url) {
  setSetting(guildId, "banner_image_url", url);
}

// ── Cooldown helpers ──────────────────────────────────────────────────────────

export function getCooldown(userId, guildId, command) {
  const row = db
    .prepare(
      "SELECT expires_at FROM cooldowns WHERE user_id = ? AND guild_id = ? AND command = ?"
    )
    .get(userId, guildId, command);
  if (!row) return 0;
  const remaining = row.expires_at - Math.floor(Date.now() / 1000);
  return remaining > 0 ? remaining : 0;
}

export function setCooldown(userId, guildId, command, seconds) {
  db.prepare(`
    INSERT INTO cooldowns (user_id, guild_id, command, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id, command) DO UPDATE SET expires_at = excluded.expires_at
  `).run(userId, guildId, command, Math.floor(Date.now() / 1000) + seconds);
}

// ── Invite helpers ────────────────────────────────────────────────────────────

export function saveInvite(code, userId, guildId) {
  db.prepare(
    "INSERT OR IGNORE INTO invites (invite_code, user_id, guild_id) VALUES (?, ?, ?)"
  ).run(code, userId, guildId);
}

export function getInvitesByUser(userId, guildId) {
  return (
    db
      .prepare("SELECT SUM(uses) as total FROM invites WHERE user_id = ? AND guild_id = ?")
      .get(userId, guildId)?.total ?? 0
  );
}

export function getInviteLeaderboard(guildId) {
  return db
    .prepare(
      `SELECT user_id, SUM(uses) as total
       FROM invites WHERE guild_id = ?
       GROUP BY user_id ORDER BY total DESC LIMIT 10`
    )
    .all(guildId);
}

export function syncInviteUses(code, uses) {
  db.prepare("UPDATE invites SET uses = ? WHERE invite_code = ?").run(uses, code);
}

// ── Vouch helpers ─────────────────────────────────────────────────────────────

export function addVouch(userId, guildId, message) {
  db.prepare("INSERT INTO vouches (user_id, guild_id, message) VALUES (?, ?, ?)").run(
    userId,
    guildId,
    message
  );
}

export function getVouches(guildId, limit = 5) {
  return db
    .prepare("SELECT * FROM vouches WHERE guild_id = ? ORDER BY id DESC LIMIT ?")
    .all(guildId, limit);
}

export default db;
