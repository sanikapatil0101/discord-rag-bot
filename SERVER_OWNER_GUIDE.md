# QuickChat — Server Owner Guidebook

Everything you need to know to add, configure and get the best out of QuickChat in your server.

---

## What is QuickChat?

QuickChat is an AI-powered support bot that learns from your server's help channel history. It reads past Q&A conversations, understands them, and automatically answers user questions when they @mention it. The more quality answers in your help channel, the smarter it gets.

---

## Step 1 — Add QuickChat to Your Server

1. Click this invite link → **[Add QuickChat to Your Server](https://discord.com/oauth2/authorize?client_id=1518868972659937353&permissions=68608&integration_type=0&scope=bot)**
2. Select your server from the dropdown
3. Click **Authorize**
4. Complete the CAPTCHA

> You need **Manage Server** permission to add the bot.

Once added, QuickChat will send a welcome message in your server's default channel.

---

## Step 2 — Set Up the Help Channel

Tell QuickChat which channel to learn from. Run this command in any channel:

```
/setup-help-channel #your-help-channel
```

Replace `#your-help-channel` with the actual channel that contains your support Q&A history.

**What happens next:**
- Bot reads all past messages from that channel
- Indexes them as searchable knowledge
- You get a confirmation when done:

```
✅ Initial sync finished. Fetched 320 messages and saved 280 searchable entries.
```

> This may take a few minutes depending on how many messages are in the channel.

---

## Step 3 — Set Up a Trusted Role (Recommended)

By default only **you (the server owner)** can provide answers that the bot learns from. To allow your moderators or support team to also contribute answers, set up a trusted role.

### Create the role

1. Click your server name at the top left
2. Go to **Server Settings → Roles**
3. Click **Create Role**
4. Name it something like `Support`, `Moderator`, or `Trusted`
5. Click **Save Changes**

### Assign the role to your team

1. Right-click a team member's name
2. Click **Roles**
3. Select the role you just created

### Tell the bot about the role

Run this command in any channel:

```
/setup-trusted-role @YourRoleName
```

Bot confirms:
```
✅ Done! Only replies from YourRoleName members and the server owner will be stored as answers.
```

> If you skip this step, only your own replies will be stored as answers. The bot still works — just limited to your answers only.

---

## Step 4 — Test the Bot

Ask the bot a question by @mentioning it in any channel:

```
@QuickChat how do I reset my password?
```

If the help channel has relevant past conversations, the bot will reply with an answer. If not, it will say:

```
I couldn't find the answer to this in the server history. Could a human admin step in and help out?
```

That's your cue to answer the question manually — and make sure to use the Reply feature (explained below).

---

## ⚠️ IMPORTANT — Always Use Discord Reply When Answering

This is the most critical thing to understand about how QuickChat learns.

### The wrong way ❌

```
UserA: how do I reset my password?
UserB: same question here!
Admin: go to settings → security tab    ← just typed in channel, no reply
```

The bot has no way to know which question the admin answered. It may link the answer to the wrong question or ignore it entirely.

### The right way ✅

```
UserA: how do I reset my password?
Admin: [replies to UserA's message] go to settings → security tab
```

When the admin uses Discord's **Reply** feature, the bot correctly pairs:
```
Q: how do I reset my password?
A: go to settings → security tab
```

This gets stored as a clean Q&A pair and the bot will use it to answer future questions correctly.

### How to use Discord Reply

1. **Hover** over the question message
2. Click the **reply icon** (curved arrow) that appears on the right
3. Type your answer
4. Press **Enter**

Or on mobile:
1. **Long press** the question message
2. Tap **Reply**
3. Type your answer and send

> ⚠️ CAUTION: If you answer without using Reply, the bot will NOT store your answer as knowledge. Always reply directly to the question message.

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

## Daily Auto Sync

QuickChat automatically syncs new messages from your help channel every day at **midnight UTC**. You don't need to do anything — it runs in the background and picks up any new Q&A pairs that were added since the last sync.

---

## Managing Help Channels

QuickChat supports multiple help channels per server. Each channel's data is stored and synced independently.

### Adding another channel

```
/setup-help-channel #another-channel
```

The bot adds it alongside any existing channels and starts an initial sync.

### Removing a channel

```
/remove-help-channel #channel-to-remove
```

This permanently deletes all stored data for that channel and stops syncing it.

> ⚠️ Removing a channel cannot be undone. Its stored Q&A data is deleted immediately.

---

## Changing the Trusted Role Later

To update the trusted role, run:

```
/setup-trusted-role @NewRoleName
```

The new role replaces the old one immediately.

---

## Removing QuickChat from Your Server

1. Left-click your server name at the top left
2. Go to **Server Settings**
3. Click **Integrations** from the left menu
4. Scroll down to find QuickChat under bots/apps
5. Click on it and select **Remove**

> ⚠️ All stored messages and data for your server are permanently deleted from the database once the bot is removed.

---

## Permissions QuickChat Needs

| Permission | Why |
|---|---|
| View Channels | To see the help channel |
| Read Message History | To sync past messages |
| Send Messages | To reply to questions |
| Use Slash Commands | For setup commands |

---

## Quick Command Reference

| Command | Who can use | What it does |
|---|---|---|
| `/setup-help-channel #channel` | Server owner / Manage Server | Adds a channel for the bot to learn from |
| `/remove-help-channel #channel` | Server owner / Manage Server | Removes a channel and deletes its stored data |
| `/setup-trusted-role @role` | Server owner / Manage Server | Sets who can provide answers |
| `/status` | Server owner / Manage Server | Shows sync state and stored entry counts |

---

## Common Issues

**Bot says it's not set up yet**
→ Run `/setup-help-channel` first

**Bot gives wrong answers**
→ Make sure trusted members always use Discord Reply when answering questions

**Bot says it can't find an answer**
→ The help channel doesn't have relevant past conversations yet. Answer the question using Reply — it will be learned for next time.

**Trusted member's answer not being stored**
→ Check they used Discord Reply on the question. Answers typed without Reply are ignored.

**Want to add more trusted members**
→ Assign them the trusted role you configured with `/setup-trusted-role`

---

## Best Practices

- Keep your help channel focused on support Q&A — avoid off-topic chat there
- Always use Discord Reply when answering questions
- The more quality Q&A pairs in your help channel, the better the bot answers
- Assign the trusted role only to people you trust to give correct answers
- If an answer changes over time, the new reply will be stored and the bot will learn the updated answer
