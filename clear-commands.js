import "dotenv/config";
import { REST, Routes } from "discord.js";

const { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_BOT_TOKEN || !CLIENT_ID) {
  console.error("❌ Missing DISCORD_BOT_TOKEN or CLIENT_ID");
  process.exit(1);
}

const rest = new REST().setToken(DISCORD_BOT_TOKEN);

try {
  console.log("🗑️  Clearing guild commands...");
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
    console.log(`✅ Cleared guild commands for ${GUILD_ID}`);
  }

  console.log("🗑️  Clearing global commands...");
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
  console.log("✅ Cleared global commands");

  console.log("\n✅ All commands cleared. Run 'npm run deploy' to re-register.");
} catch (err) {
  console.error("❌ Failed to clear commands:", err);
}
