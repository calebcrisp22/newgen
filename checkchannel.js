import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { isAdmin } from "../utils.js";
import { getSettings } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("checkchannel")
  .setDescription("Check which channels are configured for the bot [Admin]");

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const settings = getSettings(interaction.guildId);

  const genChannel = settings.gen_channel_id
    ? `<#${settings.gen_channel_id}>`
    : "❌ Not set";
  const dropChannel = settings.drop_channel_id
    ? `<#${settings.drop_channel_id}>`
    : "❌ Not set";

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔧 Bot Channel Configuration")
    .addFields(
      { name: "📢 Gen Log Channel", value: genChannel, inline: true },
      { name: "🎁 Drop Channel", value: dropChannel, inline: true },
      {
        name: "⏱️ Generate Cooldown",
        value: `${settings.cooldown_seconds ?? 30}s`,
        inline: true,
      }
    )
    .setFooter({ text: "Use /setchannel to update channels" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
