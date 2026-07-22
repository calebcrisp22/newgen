import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { isAdmin } from "../utils.js";
import db from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("viewjoins")
  .setDescription("View total tracked joins / invite stats for this server [Admin]");

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const totalInvites = db
    .prepare("SELECT COUNT(*) as c FROM invites WHERE guild_id = ?")
    .get(interaction.guildId).c;

  const totalJoins = db
    .prepare("SELECT COALESCE(SUM(uses), 0) as s FROM invites WHERE guild_id = ?")
    .get(interaction.guildId).s;

  const topInviters = db
    .prepare(
      `SELECT user_id, SUM(uses) as total
       FROM invites WHERE guild_id = ?
       GROUP BY user_id ORDER BY total DESC LIMIT 5`
    )
    .all(interaction.guildId);

  const lines =
    topInviters.length > 0
      ? topInviters.map((r, i) => `**${i + 1}.** <@${r.user_id}> — ${r.total} join(s)`).join("\n")
      : "No invites tracked yet.";

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 Join Statistics")
    .addFields(
      { name: "Total Tracked Invites", value: `**${totalInvites}**`, inline: true },
      { name: "Total Joins via Invites", value: `**${totalJoins}**`, inline: true },
      { name: "\u200b", value: "\u200b", inline: false },
      { name: "🏆 Top Inviters", value: lines }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
