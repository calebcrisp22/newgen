import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { isAdmin } from "../utils.js";
import { getSettings, setSetting } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("dropcooldown")
  .setDescription("Set the minimum time between drop events [Admin]")
  .addIntegerOption((o) =>
    o
      .setName("minutes")
      .setDescription("Minimum minutes between /dropstart uses (0 = no cooldown)")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(1440)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const minutes = interaction.options.getInteger("minutes");
  setSetting(interaction.guildId, "drop_cooldown_seconds", minutes * 60);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⏱️ Drop Cooldown Updated")
    .setDescription(
      minutes === 0
        ? "Drop cooldown has been **disabled**. Drops can start at any time."
        : `Drop events can now only be started every **${minutes} minute(s)**.`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
