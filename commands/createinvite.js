import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { saveInvite } from "../db.js";

export const data = new SlashCommandBuilder()
  .setName("createinvite")
  .setDescription("Create a tracked invite link for this server");

export async function execute(interaction) {
  const channel = interaction.channel;

  let invite;
  try {
    invite = await channel.createInvite({
      maxAge: 0, // never expires
      maxUses: 0, // unlimited uses
      unique: true,
      reason: `Tracked invite for ${interaction.user.tag}`,
    });
  } catch {
    return interaction.reply({
      content: "❌ I couldn't create an invite. Make sure I have the **Create Invite** permission.",
      flags: MessageFlags.Ephemeral,
    });
  }

  saveInvite(invite.code, interaction.user.id, interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📨 Invite Created")
    .setDescription(`Your tracked invite: **https://discord.gg/${invite.code}**`)
    .addFields({
      name: "ℹ️ Info",
      value: "This invite is linked to your account. Your invite count goes up each time someone joins with it!",
    })
    .setFooter({ text: `Use /invites to see your count` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
