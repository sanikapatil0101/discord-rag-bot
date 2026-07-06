# QuickChat — Discord Support Bot

A Discord bot that learns from your server's help channel history and answers user questions automatically using AI.

---

## How It Works

1. Bot reads and stores messages from your designated help channel
2. When a user @mentions the bot with a question, it searches through stored history
3. AI generates an answer based on real past conversations from your server
4. If no relevant answer is found, it asks a human admin to step in

---

## Adding the Bot to Your Server

1. Click the invite link → **[Add QuickChat to Your Server](https://discord.com/oauth2/authorize?client_id=1518868972659937353&permissions=68608&integration_type=0&scope=bot)**
2. Select your server from the dropdown
3. Click **Authorize**
4. Complete the CAPTCHA

> You need **Manage Server** permission on the server to add the bot.

---

## Admin Setup Guide

Once the bot joins your server, you need to tell it which channel to learn from.

### Step 1 — Run the setup command

In any channel, type:
```
/setup-help-channel #your-help-channel
```

Replace `#your-help-channel` with the actual channel that contains your support Q&A history.

### Step 2 — Wait for sync to complete

The bot will read all past messages from that channel and index them. You'll get a confirmation message when it's done.

```
✅ Initial sync finished. Fetched 320 messages and saved 280 searchable entries.
```

### Step 3 — Done

The bot is now ready to answer questions. It also automatically syncs new messages every day at midnight UTC.

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

### Tips for Better Answers

- Ask one clear question at a time
- Use keywords that would appear in past support conversations
- If the bot says it doesn't know, a human admin will need to answer — and that answer gets learned for next time!

### When the Bot Can't Answer

If the bot replies with:
> *"I couldn't find the answer to this in the server history. Could a human admin step in and help out?"*

It means no relevant past conversation was found. Ask an admin directly — once they answer (using Discord's **Reply** feature on your message), that Q&A pair gets stored and the bot will know it next time.

---

## For Best Results — Use Discord Replies

When admins answer questions, they should use Discord's **Reply** feature (right-click a message → Reply) instead of just typing in the channel.

**Why?** The bot uses reply links to correctly pair questions with their answers. Without replies, answers might get matched to the wrong questions in a busy channel.

---

## Permissions the Bot Needs

| Permission | Why |
|---|---|
| View Channels | To see the help channel |
| Read Message History | To sync past messages |
| Send Messages | To reply to questions |
| Use Slash Commands | For `/setup-help-channel` |

---

## Removing the Bot from Your Server

1. Left-click on your server name at the top left
2. Go to **Server Settings**
3. Click **Integrations** from the left menu
4. Scroll down until you see QuickChat under the bots/apps list
5. Click on it and select **Remove**

> All stored messages and data for your server are automatically deleted from the database once the bot is removed.

---

## FAQ

**Q: Can I change the help channel later?**
Run `/setup-help-channel` again with a different channel. The bot will switch and re-sync.

**Q: What happens if the bot is removed from the server?**
All stored messages and data for your server are automatically deleted from the database.

**Q: Does the bot read all channels?**
No. It only reads the specific channel you set with `/setup-help-channel`.

**Q: How often does the bot update its knowledge?**
It syncs new messages from the help channel automatically every day at midnight UTC.

**Q: Can regular users run `/setup-help-channel`?**
No. Only members with **Manage Server** permission can run that command.
