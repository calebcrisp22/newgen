import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { upsertSubscription, parseDurationSeconds } from "../db.js";
import { buildSubDMEmbed, parseDurationSeconds as parseDur, isAdmin } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("setsubscription")
  .setDescription("Grant a user a premium subscription [Admin]")
  .addUserOption((o) =>
    o.setName("user").setDescription("User to grant subscription to").setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("duration")
      .setDescription("Duration e.g. 7d, 30d, 1h, 11d")
      .setRequired(true)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const target = interaction.options.getUser("user");
  const durationStr = interaction.options.getString("duration");
  const seconds = parseDur(durationStr);

  if (seconds === 0) {
    return interaction.reply({
      content: "❌ Invalid duration format. Examples: `7d`, `30d`, `12h`, `11d`",
      flags: MessageFlags.Ephemeral,
    });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + seconds;

  upsertSubscription(
    target.id,
    interaction.guildId,
    expiresAt,
    interaction.user.username
  );

  // DM the user
  const embed = buildSubDMEmbed(durationStr, interaction.user.username);
  try {
    const dm = await target.createDM();
    await dm.send({ embeds: [embed] });
  } catch {
    // User has DMs closed — still grant it, just can't notify
  }

  await interaction.reply({
    content: `✅ Granted **Premium** subscription to ${target} for **${durationStr}**!`,
    flags: MessageFlags.Ephemeral,
  });
}
