import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { isAdmin } from "../utils.js";
import { setSetting, getSettings } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("setcooldown")
  .setDescription("Set the /generate cooldown in seconds [Admin]")
  .addIntegerOption((o) =>
    o
      .setName("seconds")
      .setDescription("Cooldown in seconds between generates (0 = no cooldown)")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(86400)
  )
  .addStringOption((o) =>
    o
      .setName("tier")
      .setDescription("Which tier to apply the cooldown to")
      .addChoices(
        { name: "Free", value: "free" },
        { name: "Premium", value: "premium" },
        { name: "Both", value: "both" }
      )
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const seconds = interaction.options.getInteger("seconds");
  const tier = interaction.options.getString("tier") ?? "both";

  if (tier === "free" || tier === "both") {
    setSetting(interaction.guildId, "cooldown_seconds", seconds);
  }
  if (tier === "premium" || tier === "both") {
    setSetting(interaction.guildId, "premium_cooldown_seconds", seconds);
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⏱️ Cooldown Updated")
    .setDescription(
      seconds === 0
        ? `Generate cooldown **disabled** for **${tier}** tier.`
        : `Generate cooldown set to **${seconds}s** for **${tier}** tier.`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
