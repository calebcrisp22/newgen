import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { isAdmin } from "../utils.js";
import db from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("messages")
  .setDescription("Send a DM announcement to all users who have generated accounts [Admin]");

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ You need **Administrator** permissions to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId("messages_modal")
    .setTitle("Send Mass DM Announcement");

  const titleInput = new TextInputBuilder()
    .setCustomId("msg_title")
    .setLabel("Title")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. 🔔 Server Announcement")
    .setRequired(true);

  const bodyInput = new TextInputBuilder()
    .setCustomId("msg_body")
    .setLabel("Message Body")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Write your announcement here...")
    .setRequired(true)
    .setMaxLength(1500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(bodyInput)
  );

  await interaction.showModal(modal);

  let submitted;
  try {
    submitted = await interaction.awaitModalSubmit({ time: 300_000 });
  } catch {
    return;
  }

  const title = submitted.fields.getTextInputValue("msg_title");
  const body = submitted.fields.getTextInputValue("msg_body");

  await submitted.reply({
    content: "📨 Sending DMs... this may take a moment.",
    flags: MessageFlags.Ephemeral,
  });

  // Fetch all unique users from subscription table + used stock recipients
  const rows = db
    .prepare(
      "SELECT DISTINCT user_id FROM subscriptions WHERE guild_id = ?"
    )
    .all(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(body)
    .setFooter({ text: `Sent by ${interaction.user.username}` })
    .setTimestamp();

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const user = await interaction.client.users.fetch(row.user_id);
      const dm = await user.createDM();
      await dm.send({ embeds: [embed] });
      sent++;
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      failed++;
    }
  }

  await submitted.editReply({
    content: `✅ Announcement sent!\n📨 Delivered: **${sent}**\n❌ Failed (DMs closed): **${failed}**`,
  });
}
