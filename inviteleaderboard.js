import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getInviteLeaderboard } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("inviteleaderboard")
  .setDescription("View the server invite leaderboard");

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const board = getInviteLeaderboard(guildId);

  const medals = ["🥇", "🥈", "🥉"];

  const lines =
    board.length > 0
      ? board
          .map((r, i) => {
            const medal = medals[i] ?? `**${i + 1}.**`;
            return `${medal} <@${r.user_id}> — **${r.total ?? 0}** invite(s)`;
          })
          .join("\n")
      : "No invites tracked yet. Use `/createinvite` to get started!";

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("📨 Invite Leaderboard")
    .setDescription(lines)
    .setFooter({ text: "Use /createinvite to get your tracked link" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
