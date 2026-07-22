import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getDropStockCount } from "../db.js";
import { activeDrops } from "./dropstop.js";

export const data = new SlashCommandBuilder()
  .setName("dropstatus")
  .setDescription("Check the status of the current drop event");

export async function execute(interaction) {
  const drop = activeDrops.get(interaction.guildId);
  const stockCount = getDropStockCount();

  if (!drop) {
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🎁 Drop Status")
      .addFields(
        { name: "Active Drop", value: "❌ None", inline: true },
        { name: "Drop Stock", value: `**${stockCount}** accounts`, inline: true }
      )
      .setFooter({ text: "Admins can start a drop with /dropstart" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🎁 Drop Status")
    .addFields(
      { name: "Active Drop", value: "✅ Running", inline: true },
      { name: "Claimed", value: `**${drop.claimed}** account(s)`, inline: true },
      { name: "Slots", value: `**${drop.maxSlots}** total`, inline: true },
      { name: "Drop Stock Remaining", value: `**${stockCount}**`, inline: true }
    )
    .setFooter({ text: "Admins can stop it with /dropstop" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
