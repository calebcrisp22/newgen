import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getDropStockCount } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("viewdropstock")
  .setDescription("View the current drop event stock count");

export async function execute(interaction) {
  const count = getDropStockCount();

  const embed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle("🎁 Drop Stock")
    .addFields({ name: "Accounts Ready", value: `**${count}**`, inline: true })
    .setFooter({ text: "Admins can start a drop with /dropstart" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
