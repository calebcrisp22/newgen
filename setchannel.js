import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { setSetting } from "../db.js";
import { isAdmin } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("setchannel")
  .setDescription("Set a bot channel [Admin]")
  .addStringOption((o) =>
    o
      .setName("type")
      .setDescription("Which channel to configure")
      .setRequired(true)
      .addChoices(
        { name: "Gen Log (public generate announcements)", value: "gen_channel_id" },
        { name: "Drop Channel", value: "drop_channel_id" }
      )
  )
  .addChannelOption((o) =>
    o
      .setName("channel")
      .setDescription("The channel to set")
      .setRequired(true)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const type = interaction.options.getString("type");
  const channel = interaction.options.getChannel("channel");

  setSetting(interaction.guildId, type, channel.id);

  const label = type === "gen_channel_id" ? "Gen Log channel" : "Drop channel";
  await interaction.reply({
    content: `✅ **${label}** set to ${channel}!`,
    flags: MessageFlags.Ephemeral,
  });
}
