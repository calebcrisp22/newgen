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
  );

export async function execute(interaction) {
  const tier = interaction.options.getString("category") ?? "free";
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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Send a public "thinking" message to build anticipation in the channel
  let loadingMessage = null;
  try {
    loadingMessage = await interaction.channel.send({
      content: "🔄 Generator is thinking... Adding account to API",
    });
  } catch {
    // Channel may be unavailable — silently skip
  }

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
      .setStyle(ButtonStyle.Danger)
      .setURL(
        "https://www.ubisoft.com/en-us/help/rainbow-six-siege/article/linking-your-ubisoft-account/000025311"
      ),
    new ButtonBuilder()
      .setLabel("Upgrade Premium ↗")
      .setStyle(ButtonStyle.Secondary)
      .setURL("https://discord.com/channels/@me")
  );

  // DM the user
  try {
    const dm = await interaction.user.createDM();
    const dmMsg = await dm.send({ embeds: [dmEmbed], components: [row] });

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
  } catch {
    return interaction.editReply({
      content:
        "❌ I couldn't DM you! Please enable DMs from server members in your privacy settings.",
    });
  }

  await interaction.editReply({
    content: "✅ **Account sent to your DMs!** Check your direct messages.",
  });

  // Keep the public "thinking" message visible for a bit, then remove it
  if (loadingMessage) {
    setTimeout(async () => {
      try {
        await loadingMessage.delete();
      } catch {
        // Message may already be deleted or inaccessible — silently skip
      }
    }, 10000);
  }

  // Post public log embed to gen channel
  const logChannelId = settings.gen_channel_id;
  if (logChannelId) {
    try {
      const logChannel = await interaction.guild.channels.fetch(logChannelId);
      if (logChannel) {
        const publicEmbed = buildPublicGenEmbed(userId, "DOKKAEBI", bannerImageUrl);
        await logChannel.send({ embeds: [publicEmbed] });
      }
    } catch {
      // Log channel may be unavailable — silently skip
    }
  }
}
