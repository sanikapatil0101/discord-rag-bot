// ---------------------------------------------------------------
// DEVELOPMENT ONLY — manual sync script (not used in deployment)
// Run locally with: npm run sync
// Deployment uses the automatic daily cron in index.js instead
// ---------------------------------------------------------------

// require('dotenv').config();
// const { Client, GatewayIntentBits } = require('discord.js');
// const { createClient } = require('@supabase/supabase-js');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { syncGuildChannel } = require('./syncService');

// const requiredEnvVars = [
//     'DISCORD_TOKEN',
//     'SUPABASE_URL',
//     'SUPABASE_KEY',
//     'GEMINI_API_KEY',
//     'HELP_CHANNEL_ID'
// ];

// const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
// if (missingEnvVars.length > 0) {
//     console.error(`Missing required .env value(s): ${missingEnvVars.join(', ')}`);
//     process.exit(1);
// }

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

// const client = new Client({
//     intents: [
//         GatewayIntentBits.Guilds,
//         GatewayIntentBits.GuildMessages,
//         GatewayIntentBits.MessageContent
//     ]
// });

// client.once('ready', async () => {
//     console.log(`Logged in as ${client.user.tag}`);

//     try {
//         const channel = await client.channels.fetch(process.env.HELP_CHANNEL_ID);
//         if (!channel || !channel.isTextBased() || !channel.messages) {
//             throw new Error('HELP_CHANNEL_ID must point to a readable text channel.');
//         }

//         const { data: setting, error: settingsError } = await supabase
//             .from('guild_settings')
//             .upsert({
//                 guild_id: channel.guild.id,
//                 help_channel_id: channel.id,
//                 is_active: true,
//                 updated_at: new Date().toISOString()
//             }, { onConflict: 'guild_id' })
//             .select('last_synced_message_id')
//             .single();

//         if (settingsError) throw settingsError;

//         console.log(`Starting manual sync for #${channel.name} in guild ${channel.guild.id}.`);

//         const result = await syncGuildChannel({
//             supabase,
//             embeddingModel,
//             channel,
//             lastSyncedMessageId: setting?.last_synced_message_id || null
//         });

//         console.log(`Sync complete. Fetched ${result.fetchedCount} messages and saved ${result.savedCount} searchable entries.`);
//     } catch (error) {
//         console.error('Error during sync:', error);
//     } finally {
//         client.destroy();
//         process.exit(0);
//     }
// });

// client.login(process.env.DISCORD_TOKEN);
