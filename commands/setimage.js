import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { isAdmin } from "../utils.js";
import { setBannerImageUrl } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("setimage")
  .setDescription("Set custom banner image for /generate embeds [Admin]")
  .addAttachmentOption((o) =>
    o
      .setName("image")
      .setDescription("Image file to use as the banner (JPG, PNG, GIF)")
      .setRequired(true)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const attachment = interaction.options.getAttachment("image");

  if (!attachment || !attachment.contentType?.startsWith("image/")) {
    return interaction.reply({
      content: "❌ Please attach an image file.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    // attachment.url is already a Discord CDN URL — no extra upload step needed
    setBannerImageUrl(interaction.guildId, attachment.url);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("✅ Custom banner set!")
      .setDescription("This image will now be used in `/generate` embeds.")
      .setImage(attachment.url)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error("Error in /setimage:", err);
    await interaction.reply({
      content: "❌ Please attach an image file.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
