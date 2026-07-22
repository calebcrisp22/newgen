import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import db from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("vouches")
  .setDescription("View all recent vouches for this server")
  .addIntegerOption((o) =>
    o
      .setName("page")
      .setDescription("Page number (10 vouches per page)")
      .setMinValue(1)
  );

export async function execute(interaction) {
  const page = interaction.options.getInteger("page") ?? 1;
  const perPage = 10;
  const offset = (page - 1) * perPage;

  const total = db
    .prepare("SELECT COUNT(*) as c FROM vouches WHERE guild_id = ?")
    .get(interaction.guildId).c;

  const vouches = db
    .prepare(
      "SELECT * FROM vouches WHERE guild_id = ? ORDER BY id DESC LIMIT ? OFFSET ?"
    )
    .all(interaction.guildId, perPage, offset);

  if (vouches.length === 0) {
    return interaction.reply({
      content:
        page > 1
          ? `❌ No vouches on page ${page}.`
          : "No vouches yet! Be the first with `/vouch submit`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const lines = vouches
    .map(
      (v) =>
        `**#${v.id}** <@${v.user_id}>\n> ${v.message.slice(0, 150)}${
          v.message.length > 150 ? "…" : ""
        }`
    )
    .join("\n\n");

  const totalPages = Math.ceil(total / perPage);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("⭐ Vouches")
    .setDescription(lines)
    .setFooter({
      text: `Page ${page}/${totalPages} • ${total} total vouch(es) • Use /deletevouch <id> to remove one`,
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
