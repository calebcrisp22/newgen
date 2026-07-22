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
  .setName("cleardropstock")
  .setDescription("Clear all unused drop stock [Admin]");

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const count = db
    .prepare("SELECT COUNT(*) as c FROM stock WHERE tier = 'drop' AND is_used = 0")
    .get().c;

  if (count === 0) {
    return interaction.reply({
      content: "📦 Drop stock is already empty.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("cleardropstock_confirm")
      .setLabel(`⚠️ Yes, clear ${count} drop account(s)`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cleardropstock_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: `⚠️ Clear **${count}** unused drop account(s)? This cannot be undone.`,
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

  if (collected.customId === "cleardropstock_cancel") {
    return collected.update({ content: "❌ Cancelled.", components: [] });
  }

  db.prepare("DELETE FROM stock WHERE tier = 'drop' AND is_used = 0").run();
  await collected.update({
    content: `✅ Cleared **${count}** drop account(s).`,
    components: [],
  });
}
