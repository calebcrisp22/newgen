import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getInvitesByUser, getInviteLeaderboard } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("invites")
  .setDescription("View your invite count or the leaderboard")
  .addUserOption((o) =>
    o.setName("user").setDescription("Check another user's invites")
  )
  .addBooleanOption((o) =>
    o.setName("leaderboard").setDescription("Show the invite leaderboard")
  );

export async function execute(interaction) {
  const showLeaderboard = interaction.options.getBoolean("leaderboard");
  const guildId = interaction.guildId;

  if (showLeaderboard) {
    const board = getInviteLeaderboard(guildId);
    const lines =
      board.length > 0
        ? board
            .map((r, i) => `**${i + 1}.** <@${r.user_id}> — **${r.total ?? 0}** invite(s)`)
            .join("\n")
        : "No invites tracked yet.";

    const embed = new EmbedBuilder()
      .setColor(0x1a1a2e)
      .setTitle("📨 Invite Leaderboard")
      .setDescription(lines)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  const target = interaction.options.getUser("user") ?? interaction.user;
  const total = getInvitesByUser(target.id, guildId);

  const embed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle("📨 Invite Stats")
    .setDescription(
      `${target} has invited **${total}** member(s) to this server.`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
