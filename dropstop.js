import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { isAdmin } from "../utils.js";

// We keep a guild-level active drop reference so dropstop can cancel it.
// The dropstart command sets this; dropstop clears it.
export const activeDrops = new Map(); // guildId -> { collector, message }

export const data = new SlashCommandBuilder()
  .setName("dropstop")
  .setDescription("Stop the currently active drop event [Admin]");

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const drop = activeDrops.get(interaction.guildId);

  if (!drop) {
    return interaction.reply({
      content: "❌ There is no active drop event in this server right now.",
      flags: MessageFlags.Ephemeral,
    });
  }

  drop.collector.stop("admin_stopped");
  activeDrops.delete(interaction.guildId);

  await interaction.reply({
    content: "✅ The active drop event has been **stopped**.",
    flags: MessageFlags.Ephemeral,
  });
}
