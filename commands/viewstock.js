import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getStockCount } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("viewstock")
  .setDescription("View current free and premium stock counts");

export async function execute(interaction) {
  const free = getStockCount("free");
  const premium = getStockCount("premium");

  const embed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle("📦 Current Stock")
    .addFields(
      { name: "🆓 Free Accounts", value: `**${free}**`, inline: true },
      { name: "💎 Premium Accounts", value: `**${premium}**`, inline: true }
    )
    .setFooter({ text: "Use /generate to claim an account" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
