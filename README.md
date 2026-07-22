# R6 Account Generator Bot

A Discord bot for generating Rainbow Six Siege accounts with premium subscription support.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in your `.env`:
   - `DISCORD_BOT_TOKEN` — Your bot token from the [Discord Developer Portal](https://discord.com/developers/applications)
   - `CLIENT_ID` — Your application's Client ID (found on the General Information page)
   - `GUILD_ID` — (Optional) Your server ID for instant slash command registration during testing

3. **Register slash commands**
   ```bash
   npm run deploy
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

---

## All Commands (28 total)

### 🆓 User Commands

| Command | Description |
|---|---|
| `/generate` | Generate a free R6 account from stock |
| `/generate Premium` | Generate a premium account (requires active subscription) |
| `/viewstock` | View current free and premium stock counts |
| `/viewdropstock` | View current drop event stock count |
| `/checksub` | Check your subscription status |
| `/invites` | View your invite count |
| `/inviteleaderboard` | View the server invite leaderboard |
| `/createinvite` | Create a tracked invite link |
| `/vouch submit` | Submit a vouch for the service |
| `/vouch list` | View recent vouches |
| `/vouches` | View all vouches with pagination |

### 🔧 Admin Commands

| Command | Description |
|---|---|
| `/addstock` | Add accounts to free or premium stock via modal |
| `/adddropstock` | Add accounts specifically to drop event stock |
| `/clearstock` | Clear all unused accounts from a stock tier |
| `/cleardropstock` | Clear all unused drop stock |
| `/edit` | View and delete accounts from stock by ID |
| `/setsubscription @user 7d` | Grant premium subscription — DMs user a confirmation |
| `/setcooldown` | Set the /generate cooldown (per tier) |
| `/dropcooldown` | Set minimum time between drop events |
| `/dropstart` | Start a drop event with a Claim button |
| `/dropstop` | Stop the active drop event |
| `/dropstatus` | Check if a drop is active and how many slots are claimed |
| `/setchannel` | Set the gen log or drop channel |
| `/checkchannel` | View current channel configuration |
| `/messages` | Send a DM announcement to all subscribed users |
| `/checksub @user` | Check another user's subscription (admin) |
| `/viewjoins` | View join/invite statistics |
| `/resetjoins` | Reset invite tracking for a user or the whole server |
| `/deletevouch` | Delete a vouch by ID |
| `/refreshinvites` | Resync invite use counts from Discord |
| `/sync` | Force re-register all slash commands (owner only) |

---

## Adding Stock

Use `/addstock` or `/adddropstock`. The modal accepts:

**Simple format** (one per line):
```
email@example.com:Password123
another@email.com:AnotherPass
```

**Full JSON format** (one account per line):
```json
{"credentials":"email@example.com:Password123","username":"PlayerName","level":168,"linkedPlatforms":["uplay","xbox","psn","steam"],"renown":21294,"r6credits":1248,"blackIces":["MP5","9mm C1","MPX"],"elites":["Alibi (Sophisticated Veneer)"],"universals":["Haze","Arctic","Diamond"],"rankedHistory":["Silver (Tenfold Pursuit)","Gold (Tenfold Pursuit)"],"skinLink":"https://ubiskins.com/profile/..."}
```

---

## Database

Uses **SQLite** (`bot.db`) — no external database required. The file is created automatically on first run.

---

## Required Bot Permissions

- Send Messages
- Embed Links
- Create Instant Invite
- Manage Guild (for invite tracking)
- Read Message History

### Required Intents (enable in Developer Portal → Bot)
- Server Members Intent
- Message Content Intent (optional, not strictly needed)
