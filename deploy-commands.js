import "dotenv/config";
import { REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_BOT_TOKEN || !CLIENT_ID) {
  console.error("❌ Missing DISCORD_BOT_TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

const commands = [];

const commandsPath = join(__dirname, "commands");
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = pathToFileURL(join(commandsPath, file)).href;
  const command = await import(filePath);
  if ("data" in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Queued: /${command.data.name}`);
  }
}

const rest = new REST().setToken(DISCORD_BOT_TOKEN);

try {
  console.log(`\n🔄 Registering ${commands.length} slash command(s)...`);

  let data;

  // Set a 30 second timeout for the registration
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    if (GUILD_ID) {
      // Guild commands update instantly — great for testing
      data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commands,
        signal: controller.signal,
      });
      console.log(`✅ Registered ${data.length} command(s) to guild ${GUILD_ID}`);
    } else {
      // Global commands take up to 1 hour to propagate
      data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
        signal: controller.signal,
      });
      console.log(`✅ Registered ${data.length} global command(s)`);
    }
  } finally {
    clearTimeout(timeout);
  }
} catch (err) {
  if (err.name === "AbortError") {
    console.error("❌ Command registration timed out (30s). Discord API may be slow.");
  } else {
    console.error("❌ Failed to register commands:", err.message);
  }
  process.exit(1);
}
