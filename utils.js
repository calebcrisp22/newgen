import { EmbedBuilder } from "discord.js";

// ── Embed Builders ────────────────────────────────────────────────────────────

const DEFAULT_BANNER_IMAGE_URL =
  "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUDkj/3lYBT5X9KtGMcZHMvHGfA6/cf2c5e07ef4bc8abd1e5c49c0c7f0f38/r6s-operators-dokkaebi.jpg";

export function buildPublicGenEmbed(userId, tier = "free", operatorName = "DOKKAEBI", imageUrl = null) {
  // Minimal public embed — no account details, just who generated what tier of account.
  const embed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle("<:r6:> Account Generated")
    .setDescription(`<@${userId}> generated a **${tier}** account!`)
    .setImage(imageUrl || DEFAULT_BANNER_IMAGE_URL)
    .setFooter({ text: `${operatorName}⭐` })
    .setTimestamp();

  return embed;
}

function safeParseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function buildAccountDMEmbed(account, imageUrl = null) {
  // Parse account data
  const platforms = account.linked_platforms
    ? parsePlatformEmojis(safeParseArray(account.linked_platforms))
    : "None";

  const blackIces = safeParseArray(account.black_ices);
  const elites = safeParseArray(account.elites);
  const universals = safeParseArray(account.universals);

  const embed = new EmbedBuilder()
    .setColor(0xFF6B35) // Warm orange for R6
    .setTitle(`✨ Generated R6 Account${account.username ? ` - ${account.username}` : ""}✨`)
    .setThumbnail(imageUrl || DEFAULT_BANNER_IMAGE_URL);

  // Account info fields (top section)
  embed.addFields(
    { name: "👤 Username", value: account.username || "N/A", inline: true },
    { name: "🎖️ Level", value: `${account.level || "N/A"}`, inline: true },
    { name: "🖥️ Platforms", value: platforms, inline: true },
    {
      name: "💰 Currency",
      value: `${(account.renown || 0).toLocaleString()} Renown / ${(account.r6credits || 0).toLocaleString()} R6 Credits`,
      inline: true,
    }
  );

  // Inventory summary
  const invParts = [];
  if (blackIces.length > 0) invParts.push(`${blackIces.length} Black Ices`);
  if (elites.length > 0) invParts.push(`${elites.length} Elites`);
  if (universals.length > 0) invParts.push(`${universals.length} Universals`);

  const totalItems = blackIces.length + elites.length + universals.length;
  const invSummary = invParts.length > 0
    ? `${totalItems} items — ${invParts.join(", ")}`
    : "No items";

  embed.addFields({ name: "📦 Inventory", value: invSummary, inline: true });

  // Credentials — only thing in the bottom section, in a code block
  embed.addFields({
    name: "🔑 Login Credentials",
    value: `\`\`\`${account.credentials}\`\`\``,
  });

  embed.setImage(imageUrl || DEFAULT_BANNER_IMAGE_URL);

  return embed;
}

export function buildSubDMEmbed(duration, grantedBy) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + parseDurationSeconds(duration);
  const timeLeft = formatDuration(expiresAt - now);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("💎 Premium Subscription Activated!")
    .setDescription(
      "You now have **Premium** access to the account generator!"
    )
    .addFields(
      { name: "⏰ Duration", value: duration },
      { name: "⌛ Time Left", value: timeLeft },
      {
        name: "📝 How to use",
        value: "Use `/generate Premium` to get premium accounts!",
      }
    )
    .setFooter({ text: `Granted by ${grantedBy}` })
    .setTimestamp();
}

// ── Duration Utilities ────────────────────────────────────────────────────────

export function parseDurationSeconds(str) {
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let total = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const val = parseInt(match[1]);
    switch (match[2].toLowerCase()) {
      case "d": total += val * 86400; break;
      case "h": total += val * 3600; break;
      case "m": total += val * 60; break;
      case "s": total += val; break;
    }
  }
  return total || 86400; // default 1 day
}

export function formatDuration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

// ── Platform Emoji Map ────────────────────────────────────────────────────────

const PLATFORM_EMOJIS = {
  uplay: "🖥️",
  ubisoft: "🖥️",
  xbox: "🎮",
  psn: "🎮",
  playstation: "🎮",
  steam: "♨️",
  epic: "🎯",
};

export function parsePlatformEmojis(platforms) {
  if (!Array.isArray(platforms)) return "None";
  return (
    platforms
      .map((p) => {
        const emoji = PLATFORM_EMOJIS[p.toLowerCase()] ?? "🔗";
        return `${emoji} ${p}`;
      })
      .join(" ") || "None"
  );
}

// ── Admin Check ───────────────────────────────────────────────────────────────

export function isAdmin(member) {
  return (
    member.permissions.has("Administrator") ||
    member.permissions.has("ManageGuild")
  );
}

// ── Parse Account Input ───────────────────────────────────────────────────────

export function parseAccountInput(input) {
  const trimmed = input.trim();

  // Try JSON first
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed.credentials) throw new Error("Missing credentials field");
      return parsed;
    } catch (e) {
      return null;
    }
  }

  // Fall back to plain email:password
  if (trimmed.includes(":")) {
    return { credentials: trimmed };
  }

  return null;
}
