import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
} from "discord.js";
import { popDropAccount, getDropStockCount, addAccount } from "../db.js";
import { buildAccountDMEmbed, isAdmin } from "../utils.js";
import { activeDrops } from "./dropstop.js";

export const data = new SlashCommandBuilder()
  .setName("dropstart")
  .setDescription("Start a drop event — first users to click get an account [Admin]")
  .addIntegerOption((o) =>
    o
      .setName("slots")
      .setDescription("How many accounts to give out (default: all in drop stock)")
      .setMinValue(1)
  )
  .addIntegerOption((o) =>
    o
      .setName("duration")
      .setDescription("Seconds the drop is open (default: 60)")
      .setMinValue(10)
      .setMaxValue(600)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (activeDrops.has(interaction.guildId)) {
    return interaction.reply({
      content: "❌ A drop is already running! Use `/dropstop` to end it first.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const maxSlots = interaction.options.getInteger("slots") ?? getDropStockCount();
  const duration = interaction.options.getInteger("duration") ?? 60;

  if (maxSlots === 0) {
    return interaction.reply({
      content: "❌ No accounts in drop stock! Use `/adddropstock` first.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const claimed = new Set();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎁 Account Drop Event!")
    .setDescription(
      `**${maxSlots}** Rainbow Six Siege account(s) are up for grabs!\n\nClick **Claim** to get yours — first come, first served.`
    )
    .addFields(
      { name: "Slots", value: `${maxSlots}`, inline: true },
      { name: "Ends In", value: `${duration}s`, inline: true }
    )
    .setImage(
      "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUDkj/3lYBT5X9KtGMcZHMvHGfA6/cf2c5e07ef4bc8abd1e5c49c0c7f0f38/r6s-operators-dokkaebi.jpg"
    )
    .setFooter({ text: "DOKKAEBI⭐" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("drop_claim")
      .setLabel("🎁 Claim")
      .setStyle(ButtonStyle.Success)
  );

  const msg = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: duration * 1000,
  });

  // Register in activeDrops so /dropstop and /dropstatus can reference it
  activeDrops.set(interaction.guildId, {
    collector,
    message: msg,
    claimed,
    maxSlots,
  });

  collector.on("collect", async (btn) => {
    if (btn.customId !== "drop_claim") return;
    if (claimed.has(btn.user.id)) {
      return btn.reply({
        content: "⚠️ You already claimed an account from this drop!",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (claimed.size >= maxSlots) {
      return btn.reply({
        content: "❌ All accounts have been claimed! Keep an eye out for the next drop.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const account = popDropAccount();
    if (!account) {
      return btn.reply({ content: "❌ No accounts left!", flags: MessageFlags.Ephemeral });
    }

    claimed.add(btn.user.id);

    try {
      const dm = await btn.user.createDM();
      await dm.send({ embeds: [buildAccountDMEmbed(account)] });
      await btn.reply({
        content: "✅ Account sent to your DMs!",
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      // Re-add account if DM failed
      addAccount({ ...account, tier: "drop" });
      claimed.delete(btn.user.id);
      await btn.reply({
        content: "❌ Couldn't DM you! Enable DMs from server members and try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  collector.on("end", async () => {
    activeDrops.delete(interaction.guildId);
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("drop_claim")
        .setLabel(`🎁 Ended — ${claimed.size}/${maxSlots} claimed`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
}
