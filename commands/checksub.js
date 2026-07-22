import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { getSubscription, hasActiveSub } from "../db.js";
import { formatDuration } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("checksub")
  .setDescription("Check your (or another user's) subscription status")
  .addUserOption((o) =>
    o.setName("user").setDescription("User to check (Admin only for others)")
  );

export async function execute(interaction) {
  const targetUser = interaction.options.getUser("user");
  const isCheckingOther = !!targetUser && targetUser.id !== interaction.user.id;

  // Only admins can check other people
  if (isCheckingOther) {
    const { isAdmin } = await import("../utils.js");
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ You can only check your own subscription.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  const target = targetUser ?? interaction.user;
  const sub = getSubscription(target.id, interaction.guildId);
  const now = Math.floor(Date.now() / 1000);

  if (!sub || sub.expires_at <= now) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌ No Active Subscription")
          .setDescription(
            `${target} does not have an active Premium subscription.\n\nContact a server admin to get one!`
          )
          .setTimestamp(),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const remaining = sub.expires_at - now;
  const expiresDate = new Date(sub.expires_at * 1000).toUTCString();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("💎 Active Premium Subscription")
    .addFields(
      { name: "User", value: `${target}`, inline: true },
      { name: "⌛ Time Left", value: formatDuration(remaining), inline: true },
      { name: "📅 Expires", value: expiresDate, inline: false },
      { name: "Granted By", value: sub.granted_by, inline: true }
    )
    .setFooter({ text: "Use /generate Premium to use your subscription" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
