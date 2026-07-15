# QuickChat — Discord Support Bot

A Discord bot that learns from your server's help channel history and answers user questions automatically using AI.

---

## How It Works

1. Bot reads and stores messages from your designated help channel
2. Only replies from trusted members (server owner or trusted role) are stored as answers
3. When a user @mentions the bot with a question, it searches through stored history
4. AI generates an answer based on real past conversations from your server
5. If no relevant answer is found, it asks a human admin to step in

---

## Adding the Bot to Your Server

1. Click the invite link → **[Add QuickChat to Your Server](https://discord.com/oauth2/authorize?client_id=1518868972659937353&permissions=68608&integration_type=0&scope=bot)**
2. Select your server from the dropdown
3. Click **Authorize**
4. Complete the CAPTCHA

> You need **Manage Server** permission on the server to add the bot.

---

## Admin Setup Guide

### Step 1 — Set the help channel

In any channel, type:
```
/setup-help-channel #your-help-channel
```

The bot will read all past messages from that channel and index them. You'll get a confirmation when done:

```
✅ Initial sync finished. Fetched 320 messages and saved 280 searchable entries.
```

### Step 2 — Set a trusted role (recommended)

By default only the server owner's replies are stored as answers. To let your moderators or support team contribute answers too, run:

```
/setup-trusted-role @YourRoleName
```

Only replies from members with this role (and the server owner) will be stored as knowledge.

### Step 3 — Done

The bot is ready to answer questions. It also automatically syncs new messages every day at midnight UTC.

> 📖 For the full admin setup guide including trusted role setup, reply best practices, and storage rules, see [SERVER_OWNER_GUIDE.md](SERVER_OWNER_GUIDE.md)

---

## User Guide

### Asking a Question

Simply **@mention the bot** followed by your question in any channel:

```
@QuickChat how do I reset my password?
```

```
@QuickChat where can I find the dashboard?
```

The bot will reply with an answer based on your server's history.

### Limits

- Questions must be under **500 characters**
- You can ask one question every **7 seconds** — if you ask too fast the bot will ask you to slow down

### When the Bot Can't Answer

If the bot replies with:
> *"I couldn't find the answer to this in the server history. Could a human admin step in and help out?"*

It means no relevant past conversation was found. Ask an admin directly — once they answer using Discord's **Reply** feature, that Q&A pair gets stored and the bot will know it next time.

> 📖 For the full member guide including tips, limitations, and FAQ, see [USER_GUIDE.md](USER_GUIDE.md)

---

## How the Bot Decides What to Store

Not every message gets stored. QuickChat only stores a message when ALL of these are true:

| Condition | Required |
|---|---|
| Message is a Discord Reply to another message | ✅ Yes |
| Reply author is server owner OR has trusted role | ✅ Yes |
| Message has actual text content | ✅ Yes |
| Message is from a human (not a bot) | ✅ Yes |

If any condition is not met → message is ignored.

---

## For Best Results — Use Discord Replies

When admins answer questions, they must use Discord's **Reply** feature (right-click a message → Reply) instead of just typing in the channel.

**Why?** The bot uses reply links to correctly pair questions with their answers. Without replies, the answer is ignored entirely.

---

## Managing Help Channels

QuickChat supports multiple help channels per server. Each channel's data is stored and synced independently.

To add another channel:
```
/setup-help-channel #another-channel
```

To remove a channel and delete its stored data:
```
/remove-help-channel #channel-to-remove
```

---

## Slash Commands

| Command | Who can use | What it does |
|---|---|---|
| `/setup-help-channel #channel` | Server owner / Manage Server | Adds a channel for the bot to learn from |
| `/remove-help-channel #channel` | Server owner / Manage Server | Removes a channel and deletes its stored data |
| `/setup-trusted-role @role` | Server owner / Manage Server | Sets who can provide answers |
| `/status` | Server owner / Manage Server | Shows sync state and stored entry counts |

---

## Permissions the Bot Needs

| Permission | Why |
|---|---|
| View Channels | To see the help channel |
| Read Message History | To sync past messages |
| Send Messages | To reply to questions |
| Use Slash Commands | For setup commands |

---

## Removing the Bot from Your Server

1. Left-click on your server name at the top left
2. Go to **Server Settings**
3. Click **Integrations** from the left menu
4. Scroll down until you see QuickChat under the bots/apps list
5. Click on it and select **Remove**

> ⚠️ All stored messages and data for your server are permanently deleted from the database once the bot is removed.

---

## FAQ

**Q: How do I check if the bot is synced?**
Run `/status` to see all configured help channels, when each was last synced, total stored entries, and the trusted role.

**Q: Can I add multiple help channels?**
Yes. Run `/setup-help-channel` for each channel you want the bot to learn from. Each channel is synced independently.

**Q: How do I remove a help channel?**
Run `/remove-help-channel` and select the channel. All stored data for that channel is permanently deleted.

**Q: Can I change the trusted role later?**
Yes. Run `/setup-trusted-role` again with a different role. The new role replaces the old one immediately.

**Q: What happens if the bot is removed from the server?**
All stored messages and data for your server are permanently deleted from the database.

**Q: Does the bot answer questions from any channel?**
The bot answers @mentions from any channel, but it only searches the stored history of the channel where the question was asked. Each help channel's knowledge is kept separate.

**Q: Does the bot read all channels?**
No. It only reads the specific channels you add with `/setup-help-channel`.

**Q: How often does the bot update its knowledge?**
It syncs new messages from the help channel automatically every day at midnight UTC.

**Q: Can regular users run the setup commands?**
No. Only members with **Manage Server** permission can run `/setup-help-channel` and `/setup-trusted-role`.

**Q: Why isn't the bot storing my team's answers?**
Make sure they are using Discord's **Reply** feature on the question message, and that they have the trusted role assigned.

**Q: Why did the bot ask me to slow down?**
There is a 7-second cooldown between questions per user. Wait a moment and ask again.

**Q: My question is too long — what do I do?**
Keep questions under 500 characters. Try summarising what you need.
