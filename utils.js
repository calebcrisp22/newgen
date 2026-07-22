import { EmbedBuilder } from "discord.js";

// ── Embed Builders ────────────────────────────────────────────────────────────

const DEFAULT_BANNER_IMAGE_URL =
  "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUDkj/3lYBT5X9KtGMcZHMvHGfA6/cf2c5e07ef4bc8abd1e5c49c0c7f0f38/r6s-operators-dokkaebi.jpg";

export function buildPublicGenEmbed(username, operatorName = "DOKKAEBI", imageUrl = null) {
  return new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle("<:r6:> Account Generated")
    .setDescription(`<@${username}> generated an account!`)
    .setImage(imageUrl || DEFAULT_BANNER_IMAGE_URL)
    .setFooter({ text: `${operatorName}⭐` })
    .setTimestamp();
}

export function buildAccountDMEmbed(account, imageUrl = null) {
  const platforms = account.linked_platforms
    ? parsePlatformEmojis(JSON.parse(account.linked_platforms))
    : "None";

  const blackIces = account.black_ices
    ? JSON.parse(account.black_ices)
    : [];
  const elites = account.elites ? JSON.parse(account.elites) : [];
  const universals = account.universals
    ? JSON.parse(account.universals)
    : [];
  const rankedHistory = account.ranked_history
    ? JSON.parse(account.ranked_history)
    : [];

  const embed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle(
      `Generated Account${account.username ? ` - ${account.username}` : ""}`
    )
    .setThumbnail(imageUrl || DEFAULT_BANNER_IMAGE_URL);

  if (account.username)
    embed.addFields({ name: "Username ➡️", value: account.username, inline: true });
  if (account.level)
    embed.addFields({ name: "Level ➡️", value: `${account.level}`, inline: true });
  if (account.linked_platforms)
    embed.addFields({ name: "Linked Platforms ➡️", value: platforms, inline: true });

  if (account.renown || account.r6credits) {
    const currency = [
      account.renown ? `🏅 ${account.renown.toLocaleString()}` : null,
      account.r6credits ? `<:r6c:> ${account.r6credits.toLocaleString()}` : null,
    ]
      .filter(Boolean)
      .join("  ");
    embed.addFields({ name: "Currency ➡️", value: currency });
  }

  // Inventory section
  const invLines = [];
  if (blackIces.length > 0)
    invLines.push(`🟢 **Black Ices (${blackIces.length}):** ${blackIces.join(", ")}`);
  if (elites.length > 0)
    invLines.push(`😺 **Elites (${elites.length}):** ${elites.join(", ")}`);
  if (universals.length > 0)
    invLines.push(`🔶 **Universals (${universals.length}):** ${universals.join(", ")}`);
  if (rankedHistory.length > 0)
    invLines.push(
      `🏆 **Ranked History (${rankedHistory.length}):** ${rankedHistory.join(", ")}`
    );

  if (invLines.length > 0) {
    embed.addFields({ name: "🎮 Inventory:", value: invLines.join("\n") });
  }

  embed.addFields({
    name: "Login Credentials:",
    value: `\`\`\`${account.credentials}\`\`\``,
  });

  if (account.skin_link) {
    embed.addFields({
      name: "Skin Link:",
      value: account.skin_link,
    });
  }

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
