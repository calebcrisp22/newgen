import "dotenv/config";
import { Client, Collection, GatewayIntentBits, Events } from "discord.js";
import { readdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { syncInviteUses } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Client Setup ──────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();

// ── Load Commands ─────────────────────────────────────────────────────────────

const commandsPath = join(__dirname, "commands");
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = pathToFileURL(join(commandsPath, file)).href;
  const command = await import(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.warn(`⚠️  Skipping ${file} — missing data or execute export`);
  }
}

// ── Invite Cache ──────────────────────────────────────────────────────────────

const inviteCache = new Map(); // guildId -> Map<code, uses>

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    invites.forEach((inv) => map.set(inv.code, inv.uses));
    inviteCache.set(guild.id, map);
  } catch {
    // Missing permission — skip
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async (c) => {
  console.log(`\n🤖 Logged in as ${c.user.tag}`);
  console.log(`📡 Serving ${c.guilds.cache.size} guild(s)\n`);

  // Cache invites for all guilds
  for (const guild of c.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  await cacheGuildInvites(guild);
});

// Track who invited whom by comparing invite uses before/after join
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const oldMap = inviteCache.get(member.guild.id) ?? new Map();
    const newInvites = await member.guild.invites.fetch();

    let usedCode = null;
    for (const [code, inv] of newInvites) {
      const oldUses = oldMap.get(code) ?? 0;
      if (inv.uses > oldUses) {
        usedCode = code;
        syncInviteUses(code, inv.uses);
        break;
      }
    }

    // Rebuild cache
    const updated = new Map();
    newInvites.forEach((inv) => updated.set(inv.code, inv.uses));
    inviteCache.set(member.guild.id, updated);

    if (usedCode) {
      console.log(`📨 ${member.user.tag} joined via invite ${usedCode}`);
    }
  } catch {
    // Missing permission — skip
  }
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Error in /${interaction.commandName}:`, err);
      const payload = {
        content: "❌ An error occurred while running this command.",
        flags: 64, // ephemeral
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────

if (!process.env.DISCORD_BOT_TOKEN) {
  console.error("❌ DISCORD_BOT_TOKEN is not set in your .env file!");
  process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN);
