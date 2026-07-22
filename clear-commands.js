import "dotenv/config";
import { REST, Routes } from "discord.js";

const { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_BOT_TOKEN || !CLIENT_ID) {
  console.error("❌ Missing DISCORD_BOT_TOKEN or CLIENT_ID");
  process.exit(1);
}

// Helper to race a promise against a fixed timeout so we can tell whether a
// rest.put() call is hanging (never resolving/rejecting) vs. actually failing.
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`⏱️  Timed out after ${ms}ms waiting for: ${label}`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

console.log("Token format:", DISCORD_BOT_TOKEN?.substring(0, 10) + "...");
console.log("ℹ️  CLIENT_ID:", CLIENT_ID);
console.log("ℹ️  GUILD_ID:", GUILD_ID || "(not set)");

console.log("About to create REST client");
const rest = new REST().setToken(DISCORD_BOT_TOKEN);
console.log("REST client created successfully");

try {
  console.log("🗑️  Clearing guild commands...");
  if (GUILD_ID) {
    const guildUrl = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
    console.log("About to call rest.put() for URL:", guildUrl);
    console.log("Token format:", DISCORD_BOT_TOKEN?.substring(0, 10) + "...");

    try {
      await withTimeout(
        rest.put(guildUrl, { body: [] }),
        10000,
        `rest.put(${guildUrl})`
      );
      console.log(`✅ Cleared guild commands for ${GUILD_ID}`);
    } catch (guildErr) {
      console.error(`❌ Failed/timed out clearing guild commands for ${GUILD_ID}:`, guildErr.message);
    }
  }

  console.log("🗑️  Clearing global commands...");
  const globalUrl = Routes.applicationCommands(CLIENT_ID);
  console.log("About to call rest.put() for URL:", globalUrl);
  console.log("Token format:", DISCORD_BOT_TOKEN?.substring(0, 10) + "...");

  try {
    await withTimeout(
      rest.put(globalUrl, { body: [] }),
      10000,
      `rest.put(${globalUrl})`
    );
    console.log("✅ Cleared global commands");
  } catch (globalErr) {
    console.error("❌ Failed/timed out clearing global commands:", globalErr.message);
  }

  console.log("\n✅ All commands cleared. Run 'npm run deploy' to re-register.");
} catch (err) {
  console.error("❌ Failed to clear commands:", err);
  console.error(
    "⚠️  Continuing anyway — clearing commands failed, but this should not block bot startup."
  );
  // Intentionally do NOT exit with a failure code. Command clearing failing
  // (e.g. Discord outage or rate limiting) should never prevent the bot from
  // starting up.
}
