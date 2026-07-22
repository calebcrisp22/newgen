import {
  SlashCommandBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { addAccount, getStockCount } from "../db.js";
import { isAdmin, parseAccountInput } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("addstock")
  .setDescription("Add one or more accounts to the free stock [Admin]")
  .addStringOption((o) =>
    o
      .setName("tier")
      .setDescription("Which stock to add to")
      .setRequired(true)
      .addChoices(
        { name: "Free", value: "free" },
        { name: "Premium", value: "premium" }
      )
  )
  .addAttachmentOption((o) =>
    o
      .setName("file")
      .setDescription("File with accounts (one per line, email:pass or JSON)")
      .setRequired(false)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const tier = interaction.options.getString("tier");
  const attachment = interaction.options.getAttachment("file");

  if (attachment) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let raw;
    try {
      const res = await fetch(attachment.url);
      raw = await res.text();
    } catch (e) {
      return interaction.editReply({
        content: "❌ Failed to download the attached file.",
      });
    }

    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let added = 0;
    const failed = [];

    for (const line of lines) {
      const parsed = parseAccountInput(line);
      if (!parsed) {
        failed.push(line.slice(0, 40) + "…");
        continue;
      }
      addAccount({ ...parsed, tier });
      added++;
    }

    const after = getStockCount(tier);

    let msg = `✅ Added **${added}** account(s) to **${tier}** stock. Total: **${after}**`;
    if (failed.length > 0) {
      msg += `\n\n❌ Failed to parse **${failed.length}** line(s):\n${failed
        .slice(0, 5)
        .map((f) => `• \`${f}\``)
        .join("\n")}`;
    }

    return interaction.editReply({ content: msg });
  }

  const modal = new ModalBuilder()
    .setCustomId(`addstock_modal_${tier}`)
    .setTitle(`Add ${tier.charAt(0).toUpperCase() + tier.slice(1)} Stock`);

  const input = new TextInputBuilder()
    .setCustomId("accounts_input")
    .setLabel("Accounts (one per line, JSON or email:pass)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      'email:pass\nor\n{"credentials":"email:pass","username":"Player","level":100,...}'
    )
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);

  // Handle modal submit
  let submitted;
  try {
    submitted = await interaction.awaitModalSubmit({ time: 300_000 });
  } catch {
    return;
  }

  const raw = submitted.fields.getTextInputValue("accounts_input");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let added = 0;
  const failed = [];

  for (const line of lines) {
    const parsed = parseAccountInput(line);
    if (!parsed) {
      failed.push(line.slice(0, 40) + "…");
      continue;
    }
    addAccount({ ...parsed, tier });
    added++;
  }

  const after = getStockCount(tier);

  let msg = `✅ Added **${added}** account(s) to **${tier}** stock. Total: **${after}**`;
  if (failed.length > 0) {
    msg += `\n\n❌ Failed to parse **${failed.length}** line(s):\n${failed
      .slice(0, 5)
      .map((f) => `• \`${f}\``)
      .join("\n")}`;
  }

  await submitted.reply({ content: msg, flags: MessageFlags.Ephemeral });
}
