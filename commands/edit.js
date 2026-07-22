import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  listAccounts,
  getAccountById,
  deleteAccountById,
  getStockCount,
} from "../db.js";
import { isAdmin } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("edit")
  .setDescription("View, edit, or delete accounts in stock [Admin]")
  .addStringOption((o) =>
    o
      .setName("tier")
      .setDescription("Which stock to inspect")
      .addChoices(
        { name: "Free", value: "free" },
        { name: "Premium", value: "premium" },
        { name: "Drop", value: "drop" }
      )
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const tier = interaction.options.getString("tier") ?? "free";
  const accounts = listAccounts(tier, 10);
  const total = getStockCount(tier);

  if (accounts.length === 0) {
    return interaction.reply({
      content: `📦 No accounts in **${tier}** stock.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x1a1a2e)
    .setTitle(`📦 ${tier.charAt(0).toUpperCase() + tier.slice(1)} Stock — Top ${accounts.length} / ${total} remaining`)
    .setDescription(
      accounts
        .map(
          (a, i) =>
            `**${i + 1}.** ID: \`${a.id}\` | ${
              a.username ? `**${a.username}** (Lv.${a.level ?? "?"})` : a.credentials.split(":")[0]
            }`
        )
        .join("\n")
    )
    .setFooter({ text: "Use the buttons below to delete by ID" });

  const deleteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`stock_delete_prompt_${tier}`)
      .setLabel("🗑️ Delete by ID")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({
    embeds: [embed],
    components: [deleteRow],
    flags: MessageFlags.Ephemeral,
  });

  const msg = await interaction.fetchReply();
  const collector = msg.createMessageComponentCollector({ time: 120_000 });

  collector.on("collect", async (btn) => {
    if (btn.customId === `stock_delete_prompt_${tier}`) {
      const modal = new ModalBuilder()
        .setCustomId("delete_account_modal")
        .setTitle("Delete Account by ID");

      const idInput = new TextInputBuilder()
        .setCustomId("account_id")
        .setLabel("Account ID (from list above)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. 42")
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(idInput));
      await btn.showModal(modal);

      let submitted;
      try {
        submitted = await btn.awaitModalSubmit({ time: 60_000 });
      } catch { return; }

      const id = parseInt(submitted.fields.getTextInputValue("account_id"));
      const account = getAccountById(id);

      if (!account) {
        return submitted.reply({
          content: `❌ No account found with ID \`${id}\`.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      deleteAccountById(id);
      await submitted.reply({
        content: `✅ Deleted account ID \`${id}\` (\`${account.credentials.split(":")[0]}\`).`,
        flags: MessageFlags.Ephemeral,
      });
    }
  });
}
