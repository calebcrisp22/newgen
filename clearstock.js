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
  .setName("clearstock")
  .setDescription("Clear all unused accounts from a stock tier [Admin]")
  .addStringOption((o) =>
    o
      .setName("tier")
      .setDescription("Which stock to clear")
      .setRequired(true)
      .addChoices(
        { name: "Free", value: "free" },
        { name: "Premium", value: "premium" },
        { name: "Drop", value: "drop" },
        { name: "All", value: "all" }
      )
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const tier = interaction.options.getString("tier");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`clearstock_confirm_${tier}`)
      .setLabel(`⚠️ Yes, clear ${tier} stock`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("clearstock_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: `⚠️ Are you sure you want to delete **all unused ${tier} accounts** from stock? This cannot be undone.`,
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

  if (collected.customId === "clearstock_cancel") {
    return collected.update({ content: "❌ Cancelled.", components: [] });
  }

  let result;
  if (tier === "all") {
    result = db.prepare("DELETE FROM stock WHERE is_used = 0").run();
  } else {
    result = db
      .prepare("DELETE FROM stock WHERE tier = ? AND is_used = 0")
      .run(tier);
  }

  await collected.update({
    content: `✅ Cleared **${result.changes}** account(s) from **${tier}** stock.`,
    components: [],
  });
}
