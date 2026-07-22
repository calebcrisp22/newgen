import { SlashCommandBuilder, MessageFlags, REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const data = new SlashCommandBuilder()
  .setName("sync")
  .setDescription("Force re-sync all slash commands (Owner only)");

export async function execute(interaction) {
  // Owner-only: only the application owner can run this
  const app = await interaction.client.application.fetch();
  const isOwner =
    interaction.user.id === app.owner?.id ||
    app.owner?.members?.has(interaction.user.id);

  if (!isOwner) {
    return interaction.reply({
      content: "❌ Only the **bot owner** can use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    content: "🔄 Syncing all commands...",
    flags: MessageFlags.Ephemeral,
  });

  const commands = [];
  const commandsPath = join(__dirname);
  const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = pathToFileURL(join(commandsPath, file)).href;
    const command = await import(filePath);
    if ("data" in command) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        interaction.client.user.id,
        interaction.guildId
      ),
      { body: commands }
    );
    await interaction.editReply({
      content: `✅ Synced **${commands.length}** command(s) to this guild.`,
    });
  } catch (err) {
    await interaction.editReply({
      content: `❌ Sync failed: \`${err.message}\``,
    });
  }
}
