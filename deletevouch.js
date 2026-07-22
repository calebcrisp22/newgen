import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { isAdmin } from "../utils.js";
import db from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("deletevouch")
  .setDescription("Delete a vouch by ID [Admin]")
  .addIntegerOption((o) =>
    o
      .setName("id")
      .setDescription("Vouch ID to delete (use /vouches to see IDs)")
      .setRequired(true)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const id = interaction.options.getInteger("id");
  const vouch = db.prepare("SELECT * FROM vouches WHERE id = ?").get(id);

  if (!vouch) {
    return interaction.reply({
      content: `❌ No vouch found with ID \`${id}\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("deletevouch_confirm")
      .setLabel("🗑️ Delete Vouch")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("deletevouch_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: `Delete vouch #${id} from <@${vouch.user_id}>: *"${vouch.message.slice(0, 100)}"*?`,
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

  if (collected.customId === "deletevouch_cancel") {
    return collected.update({ content: "❌ Cancelled.", components: [] });
  }

  db.prepare("DELETE FROM vouches WHERE id = ?").run(id);
  await collected.update({
    content: `✅ Deleted vouch #${id}.`,
    components: [],
  });
}
