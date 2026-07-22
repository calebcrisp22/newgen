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

// Set a global timeout - if deployment takes longer than 90 seconds, something is wrong
const deploymentTimeout = setTimeout(() => {
  console.error("\n❌ Command deployment timed out after 90 seconds. Discord API is not responding.");
  console.error("This usually happens when Discord is rate-limiting or has connectivity issues.");
  process.exit(1);
}, 90000);

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

console.log("About to create REST client");
const rest = new REST().setToken(DISCORD_BOT_TOKEN);
console.log("REST client created successfully");

// Validate CLIENT_ID and GUILD_ID before making any API calls
if (!CLIENT_ID || CLIENT_ID === "undefined") {
  console.error("❌ CLIENT_ID is not set. Check your .env file.");
  process.exit(1);
}

if (GUILD_ID === "undefined") {
  console.error("❌ GUILD_ID is set to the string 'undefined'. Check your .env file.");
  process.exit(1);
}

console.log(`ℹ️  CLIENT_ID: ${CLIENT_ID}`);
console.log(`ℹ️  GUILD_ID: ${GUILD_ID || "(not set — deploying globally)"}`);

try {
  console.log(`\n🔄 Registering ${commands.length} slash command(s)...`);

  let data;

  console.log(
    "📦 Commands queued for registration (names only):",
    commands.map((c) => c.name)
  );

  if (GUILD_ID) {
    // Guild commands update instantly — great for testing.
    // Register commands one at a time (instead of a single bulk PUT) to avoid
    // sending a large request body, which appears to be rate-limited/blocked
    // when coming from Railway's IP.
    console.log(
      `➡️  Registering ${commands.length} command(s) individually to guild ${GUILD_ID}...`
    );

    const registered = [];
    const failed = [];

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const progress = `[${i + 1}/${commands.length}]`;
      const guildUrl = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);

      try {
        console.log(`➡️  ${progress} Registering /${command.name}...`);
        console.log("Command name being sent:", command.name);
        console.log("About to call rest.put() for URL:", guildUrl);
        console.log("Token format:", DISCORD_BOT_TOKEN?.substring(0, 10) + "...");
        console.log("CLIENT_ID:", CLIENT_ID, "GUILD_ID:", GUILD_ID);

        const result = await withTimeout(
          rest.put(guildUrl, { body: [command] }),
          10000,
          `rest.put(${guildUrl}) for /${command.name}`
        );

        console.log(`⬅️  rest.put() resolved for /${command.name}`);
        console.log(`✅ ${progress} Registered /${command.name}`);
        registered.push(...result);
      } catch (cmdErr) {
        console.error(`❌ ${progress} Failed/timed out registering /${command.name}:`, cmdErr.message);
        failed.push(command.name);
      }

      // Small delay between requests to avoid overwhelming the API
      if (i < commands.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3500));
      }
    }

    data = registered;

    console.log(
      `✅ Registered ${registered.length}/${commands.length} command(s) to guild ${GUILD_ID}`
    );
    if (failed.length > 0) {
      console.error(`⚠️  Failed to register ${failed.length} command(s): ${failed.join(", ")}`);
    }
  } else {
    // Global commands take up to 1 hour to propagate
    const globalUrl = Routes.applicationCommands(CLIENT_ID);
    console.log(
      "📦 Command names being sent (global):",
      commands.map((c) => c.name)
    );
    console.log("About to call rest.put() for URL:", globalUrl);
    console.log("Token format:", DISCORD_BOT_TOKEN?.substring(0, 10) + "...");
    console.log("CLIENT_ID:", CLIENT_ID, "GUILD_ID:", GUILD_ID || "(not set)");

    try {
      data = await withTimeout(
        rest.put(globalUrl, { body: commands }),
        10000,
        `rest.put(${globalUrl})`
      );
      console.log(`⬅️  rest.put(applicationCommands) resolved.`);
      console.log(
        "🔎 Raw response from Discord (names only):",
        data.map((c) => c.name)
      );
      console.log(`✅ Registered ${data.length} global command(s)`);
    } catch (globalErr) {
      console.error("❌ Failed/timed out registering global commands:", globalErr.message);
      throw globalErr;
    }
  }

  clearTimeout(deploymentTimeout);
} catch (err) {
  if (err.name === "AbortError") {
    console.error("❌ rest.put() timed out after 10 seconds — the request to Discord never completed.");
    console.error("This points to a network/connectivity issue reaching the Discord API.");
  } else if (err.message?.includes("timeout") || err.code === "ETIMEDOUT") {
    console.error("❌ Command registration timed out. Discord API may be overwhelmed.");
    console.error("Try running 'npm run deploy' manually again.");
  } else {
    console.error("❌ Failed to register commands:", err.message);
    console.error("🔎 Full error object:", err);
  }
  process.exit(1);
}
