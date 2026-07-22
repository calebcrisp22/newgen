import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { addVouch, getVouches } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("vouch")
  .setDescription("Submit a vouch or view recent vouches")
  .addSubcommand((s) =>
    s
      .setName("submit")
      .setDescription("Submit your vouch for the service")
      .addStringOption((o) =>
        o
          .setName("message")
          .setDescription("Your vouch message")
          .setRequired(true)
          .setMaxLength(300)
      )
  )
  .addSubcommand((s) =>
    s.setName("list").setDescription("View recent vouches")
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "submit") {
    const message = interaction.options.getString("message");
    addVouch(interaction.user.id, interaction.guildId, message);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle("✅ Vouch Submitted")
      .setDescription(`"${message}"`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (sub === "list") {
    const vouches = getVouches(interaction.guildId);
    if (vouches.length === 0) {
      return interaction.reply({
        content: "No vouches yet. Be the first with `/vouch submit`!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("⭐ Recent Vouches")
      .setDescription(
        vouches
          .map(
            (v) =>
              `<@${v.user_id}>: "${v.message}"`
          )
          .join("\n\n")
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
