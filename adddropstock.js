import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from "discord.js";
import { addDropAccount, getDropStockCount } from "../db.js";
import { isAdmin, parseAccountInput } from "../utils.js";

export const data = new SlashCommandBuilder()
  .setName("adddropstock")
  .setDescription("Add accounts specifically to the drop event stock [Admin]");

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId("adddropstock_modal")
    .setTitle("Add Drop Stock");

  const input = new TextInputBuilder()
    .setCustomId("accounts_input")
    .setLabel("Accounts (one per line, JSON or email:pass)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('email:pass\nor\n{"credentials":"email:pass","username":"Player",...}')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);

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
    addDropAccount(parsed);
    added++;
  }

  const total = getDropStockCount();
  let msg = `✅ Added **${added}** account(s) to **drop** stock. Total drop stock: **${total}**`;
  if (failed.length > 0) {
    msg += `\n\n❌ Failed to parse **${failed.length}** line(s):\n${failed
      .slice(0, 5)
      .map((f) => `• \`${f}\``)
      .join("\n")}`;
  }

  await submitted.reply({ content: msg, flags: MessageFlags.Ephemeral });
}
