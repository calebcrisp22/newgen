import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { isAdmin } from "../utils.js";
import db from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("resetjoins")
  .setDescription("Reset all invite use counts / join tracking for this server [Admin]")
  .addUserOption((o) =>
    o.setName("user").setDescription("Reset only a specific user's invites (leave blank for all)")
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetUser = interaction.options.getUser("user");
  const label = targetUser ? `${targetUser.tag}'s` : "all";

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("resetjoins_confirm")
      .setLabel(`⚠️ Yes, reset ${label} joins`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("resetjoins_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: `⚠️ Reset **${label}** invite tracking? This cannot be undone.`,
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  const msg = await interaction.fetchReply();
  let collected;
  try {
    collected = await msg.awaitMessageComponent({ time: 30_000 });
  } catch {
    return interaction.editReply({ content: "Timed out.", components: [] });
  }

  if (collected.customId === "resetjoins_cancel") {
    return collected.update({ content: "❌ Cancelled.", components: [] });
  }

  if (targetUser) {
    db.prepare("DELETE FROM invites WHERE user_id = ? AND guild_id = ?").run(
      targetUser.id,
      interaction.guildId
    );
  } else {
    db.prepare("DELETE FROM invites WHERE guild_id = ?").run(interaction.guildId);
  }

  await collected.update({
    content: `✅ Reset **${label}** invite tracking.`,
    components: [],
  });
}
