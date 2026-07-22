import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { isAdmin } from "../utils.js";
import { syncInviteUses } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("refreshinvites")
  .setDescription("Resync invite use counts from Discord [Admin]");

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const invites = await interaction.guild.invites.fetch();
    let synced = 0;
    for (const [code, inv] of invites) {
      syncInviteUses(code, inv.uses);
      synced++;
    }
    await interaction.editReply({
      content: `✅ Refreshed **${synced}** invite(s) from Discord.`,
    });
  } catch {
    await interaction.editReply({
      content: "❌ Failed to fetch invites. Make sure I have the **Manage Guild** permission.",
    });
  }
}
