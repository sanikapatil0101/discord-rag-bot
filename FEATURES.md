# QuickChat — Features

A production-deployed Discord bot that turns a server's help channel history into an AI-powered support assistant using RAG (Retrieval-Augmented Generation).

**Stack:** Node.js · Discord.js v14 · Gemini AI · Supabase (PostgreSQL + pgvector) · PM2 · Azure VM

---

## RAG-Powered Question Answering

- Users @mention the bot with a question in any channel
- Question is converted to a 3072-dimension vector using Gemini `gemini-embedding-001`
- Cosine similarity search via `pgvector` retrieves the top 8 most relevant past Q&A pairs from the server's history
- Retrieved context is passed to Gemini `gemini-3.1-flash-lite` to generate a grounded, conversational answer
- If no relevant match is found, the bot gracefully falls back and prompts a human admin to step in

## Accurate Q&A Pairing via Discord Reply References

- Only messages sent using Discord's native Reply feature are stored — plain channel messages are ignored entirely
- The bot resolves each reply's reference ID to its original question, building an explicit `Q: ... A: ...` pair before embedding
- Eliminates the Q&A mismatch problem common in busy channels where answers appear out of order or far from the question

## Trusted Member Access Control

- By default only the server owner's replies are stored as knowledge
- Admins can designate any role as trusted via `/setup-trusted-role` — only replies from that role (or the owner) get embedded and saved
- Prevents random member messages from polluting the knowledge base
- Trust check runs at both initial sync and every daily incremental sync

## Smart Channel Switching with Data Retention Choice

- When an admin switches to a different help channel, the bot pauses and presents two interactive buttons: **Keep old data** or **Delete old data**
- Keep — old channel's Q&A pairs stay in the database and mix with the new channel's knowledge
- Delete — old channel's rows are permanently removed from `discord_logs` before the new sync begins
- Prevents silent data mixing while giving admins full control over what the bot knows

## Incremental Sync with Cursor-Based Pagination

- On initial setup, the bot paginates through the entire channel history in batches of 100 messages using Discord's `before` cursor
- Tracks `last_synced_message_id` per server — daily syncs only fetch messages newer than the last processed one
- Upserts on message ID make all syncs idempotent — safe to re-run without creating duplicates

## Daily Automated Sync

- Cron job runs every day at midnight UTC across all configured servers
- Picks up new Q&A pairs added since the last sync without any admin action
- Each guild's trusted role is respected during automated syncs

## Prompt Injection Protection

- Retrieved context is wrapped in `<CONTEXT_FROM_DATABASE>` XML tags
- Explicit rules in the prompt instruct Gemini to treat context as read-only data, not instructions
- Prevents malicious stored messages from hijacking the bot's behaviour

## Automatic Data Cleanup on Bot Removal

- When the bot is removed from a server, all `discord_logs` and `guild_settings` rows for that guild are permanently deleted
- No orphaned data remains in the database after removal

## Multi-Server Isolation

- Every database query filters by `guild_id` — servers never see each other's stored data
- Each server has independent channel config, trusted role, and sync state

## Resilient API Calls with Retry Logic

- All Gemini embedding calls are wrapped in a retry function with exponential backoff (2s, 4s, 6s)
- Handles transient rate limit errors without crashing the sync

## Production Deployment

- Deployed on Azure VM (Ubuntu 24.04) managed by PM2 with auto-restart on crash
- Health check HTTP server on port 3000 for platform uptime monitoring
- Secrets injected via PM2 ecosystem config — no `.env` file on the server
- Node.js engine version pinned in `package.json` to prevent incompatibility issues
