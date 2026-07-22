import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import {
  popAccount,
  getStockCount,
  getCooldown,
  setCooldown,
  getSettings,
  hasActiveSub,
  getBannerImageUrl,
} from "../db.js";
import { buildPublicGenEmbed, buildAccountDMEmbed } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("generate")
  .setDescription("Generate a Rainbow Six Siege account from stock")
  .addStringOption((o) =>
    o
      .setName("category")
      .setDescription("Account category")
      .addChoices(
        { name: "Free", value: "free" },
        { name: "Premium", value: "premium" }
      )
      .setRequired(true)
  );

export async function execute(interaction) {
  const tier = interaction.options.getString("category");
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const settings = getSettings(guildId);

  // Premium check
  if (tier === "premium") {
    if (!hasActiveSub(userId, guildId)) {
      return interaction.reply({
        content:
          "❌ You need an active **Premium** subscription to generate premium accounts.\nContact a server admin to get one!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // Cooldown check
  const cooldownSecs =
    tier === "premium"
      ? (settings.premium_cooldown_seconds ?? 60)
      : (settings.cooldown_seconds ?? 30);
  const remaining = getCooldown(userId, guildId, `generate_${tier}`);
  if (remaining > 0) {
    return interaction.reply({
      content: `⏰ **Cooldown:** ${remaining} second(s) remaining.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Stock check
  const count = getStockCount(tier);
  if (count === 0) {
    return interaction.reply({
      content: `❌ No **${tier}** accounts in stock right now. Check back later!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Acknowledge the interaction publicly — the "thinking..." state must be
  // visible to everyone in the channel, not just the user who ran the command.
  await interaction.deferReply();

  // Show Discord's native typing indicator instead of a public embed.
  await interaction.channel.sendTyping();

  const account = popAccount(tier);
  if (!account) {
    return interaction.editReply({
      content: "❌ Stock ran out while processing. Try again!",
    });
  }

  // Set cooldown
  setCooldown(userId, guildId, `generate_${tier}`, cooldownSecs);

  // Fetch custom banner image (falls back to default inside the embed builders)
  const bannerImageUrl = getBannerImageUrl(guildId);

  // Build DM embed + buttons
  const dmEmbed = buildAccountDMEmbed(account, bannerImageUrl);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`copy_creds_${account.id}`)
      .setLabel("📋 Copy Email:Pass")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel("❓ How to Link")
      .setStyle(ButtonStyle.Link)
      .setURL(
        "https://www.ubisoft.com/en-us/help/rainbow-six-siege/article/linking-your-ubisoft-account/000025311"
      ),
    new ButtonBuilder()
      .setLabel("Upgrade Premium ↗")
      .setStyle(ButtonStyle.Link)
      .setURL("https://discord.com/channels/@me")
  );

  // DM the user — the "Adding account to API" temp message is private and only
  // ever visible in the user's DM, never in the public channel.
  let tempMsg = null;
  try {
    console.log("Starting DM creation...");
    const dm = await interaction.user.createDM();
    console.log("DM channel created, sending temp message...");

    try {
      tempMsg = await dm.send({ content: "🔄 Adding account to API" });
      console.log("Temp message sent");
    } catch (e) {
      console.error("Temp message failed:", e.message);
      // temp message failed — continue anyway
    }

    // Wait 10s, then remove the temp "Adding account" message from the DM only
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    if (tempMsg) {
      await tempMsg.delete().catch(() => {});
    }

    console.log("Sending real account embed...");
    const dmMsg = await dm.send({ embeds: [dmEmbed], components: [row] });
    console.log("Account embed sent successfully!");

    // Collector for Copy button (5 min window)
    const collector = dmMsg.createMessageComponentCollector({ time: 300_000 });
    collector.on("collect", async (btn) => {
      if (btn.customId === `copy_creds_${account.id}`) {
        await btn.reply({
          content: `\`\`\`${account.credentials}\`\`\``,
          flags: MessageFlags.Ephemeral,
        });
      }
    });
  } catch (err) {
    console.error("Full DM error:", err.message, err.code, err);
    return interaction.editReply({
      content:
        "❌ I couldn't DM you! Please enable DMs from server members in your privacy settings.",
    });
  }

  // Build the final clean public embed — minimal info only: who generated a
  // what-tier account. Detailed info stays DM-only.
  const publicEmbed = buildPublicGenEmbed(
    userId,
    tier,
    "DOKKAEBI",
    bannerImageUrl
  );

  // Post the account-generated log embed to the configured gen channel.
  const logChannelId = settings.gen_channel_id;
  if (logChannelId) {
    try {
      const logChannel = await interaction.guild.channels.fetch(logChannelId);
      await logChannel.send({ embeds: [publicEmbed] });
    } catch {
      // Log channel may be unavailable — fall back to the current channel
      await interaction.channel.send({ embeds: [publicEmbed] }).catch(() => {});
    }
  } else {
    await interaction.channel.send({ embeds: [publicEmbed] }).catch(() => {});
  }

  // Clean up the public "thinking..." acknowledgment now that processing is done.
  await interaction.deleteReply().catch(() => {});
}
