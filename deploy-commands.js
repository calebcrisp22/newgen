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

// Set a global timeout - if deployment takes longer than 45 seconds, something is wrong
const deploymentTimeout = setTimeout(() => {
  console.error("\n❌ Command deployment timed out after 45 seconds. Discord API is not responding.");
  console.error("This usually happens when Discord is rate-limiting or has connectivity issues.");
  process.exit(1);
}, 45000);

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

  if (GUILD_ID) {
    // Guild commands update instantly — great for testing
    data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log(`✅ Registered ${data.length} command(s) to guild ${GUILD_ID}`);
  } else {
    // Global commands take up to 1 hour to propagate
    data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });
    console.log(`✅ Registered ${data.length} global command(s)`);
  }

  clearTimeout(deploymentTimeout);
} catch (err) {
  if (err.message?.includes("timeout") || err.code === "ETIMEDOUT") {
    console.error("❌ Command registration timed out. Discord API may be overwhelmed.");
    console.error("Try running 'npm run deploy' manually again.");
  } else {
    console.error("❌ Failed to register commands:", err.message);
  }
  process.exit(1);
}
