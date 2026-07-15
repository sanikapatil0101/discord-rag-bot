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

## Multi-Channel Support

- A server can have multiple help channels — each added independently via `/setup-help-channel`
- Each channel has its own sync cursor (`last_synced_message_id`) in the `guild_channels` table — incremental sync is tracked per channel, not per server
- Channels can be removed individually via `/remove-help-channel` — only that channel's stored data is deleted, other channels are unaffected
- When a user asks a question, the bot searches only the stored history of the channel where the question was asked — each channel's knowledge is kept separate

## Incremental Sync with Cursor-Based Pagination

- On initial setup, the bot paginates through the entire channel history in batches of 100 messages using Discord's `before` cursor
- Tracks `last_synced_message_id` per channel — daily syncs only fetch messages newer than the last processed one
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
- `guild_channels` rows are cleaned up automatically via `ON DELETE CASCADE` — no explicit delete needed
- No orphaned data remains in the database after removal

## Multi-Server Isolation

- Every database query filters by `guild_id` — servers never see each other's stored data
- Each server has independent channel config, trusted role, and sync state

## Batch Embedding

- During sync, all qualifying Q&A pairs are collected first, then embedded in a single `batchEmbedContents` API call
- Reduces Gemini API round-trips from N calls (one per message) to one call per sync run
- Retry logic wraps the entire batch call — one retry covers all texts

## /status Command

- Admins can run `/status` to see all configured help channels, when each was last synced (relative timestamp), total stored entries, and the trusted role
- Queries `guild_channels`, `discord_logs` (count), and `guild_settings` in three lightweight reads
- Reply is ephemeral — only visible to the admin who ran the command

## HNSW Vector Index

- An HNSW index (`vector_cosine_ops`, `m=16`, `ef_construction=64`) is defined on `discord_logs.embedding`
- Reduces similarity search from O(n) sequential scan to approximately O(log n) at scale
- Uses cosine ops to match the `<=>` cosine distance operator used in `match_documents`

## Retry Logic with Exponential Backoff

- All Gemini embedding calls are wrapped in a retry function with exponential backoff (2s, 4s, 6s)
- Up to 3 attempts per call — handles transient rate limit errors without crashing the sync

## Production Deployment

- Deployed on Azure VM (Ubuntu 24.04) managed by PM2 with auto-restart on crash
- Health check HTTP server on port 3000 for platform uptime monitoring
- Secrets injected via PM2 ecosystem config — no `.env` file on the server
- Node.js engine version pinned in `package.json` to prevent incompatibility issues
