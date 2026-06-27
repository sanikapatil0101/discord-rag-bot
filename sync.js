require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize connections based on your .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// Using the HELP_CHANNEL_ID from your .env
const TARGET_CHANNEL_ID = process.env.HELP_CHANNEL_ID;

function buildConversationWindow(messages, index, windowSize = 2) {
    const start = Math.max(0, index - windowSize);
    const end = Math.min(messages.length, index + windowSize + 1);

    return messages
        .slice(start, end)
        .map((msg) => `${msg.author.username}: ${msg.content}`)
        .join('\n');
}

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    
    if (!TARGET_CHANNEL_ID) {
        console.error("❌ Missing HELP_CHANNEL_ID in your .env file!");
        process.exit(1);
    }

    console.log(`📥 Starting real data sync from channel: ${TARGET_CHANNEL_ID}`);

    try {
        // Find the channel
        const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
        if (!channel) throw new Error("Channel not found! Check your HELP_CHANNEL_ID and permissions.");

        console.log(`Reading message history from #${channel.name}...`);
        
        // Fetch the last 100 messages from the channel
        const messages = await channel.messages.fetch({ limit: 100 });
        console.log(`Found ${messages.size} messages. Processing and vectorizing...`);

        let count = 0;
        const humanMessages = Array.from(messages.values())
            .filter((msg) => !msg.author.bot && msg.content && msg.content.trim() !== '')
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        // Loop through all fetched messages
        for (let index = 0; index < humanMessages.length; index++) {
            const msg = humanMessages[index];
            const textToEmbed = buildConversationWindow(humanMessages, index);
            
            // 1. Turn the real text into a vector
            const result = await embeddingModel.embedContent(textToEmbed);
            const vector = result.embedding.values;

            // 2. Save the real text and vector to Supabase
            // We use upsert so if you run this twice, it doesn't duplicate messages
            const { error } = await supabase
                .from('discord_logs')
                .upsert({
                    id: msg.id,
                    content: textToEmbed,
                    channel_id: msg.channel.id,
                    embedding: vector
                });

            if (error) {
                console.error(`❌ Error saving message from ${msg.author.username}:`, error.message);
            } else {
                count++;
            }
        }

        console.log(`\n🎉 Success! Embedded and saved ${count} REAL messages to your database.`);
    } catch (error) {
        console.error("❌ Error during sync:", error);
    } finally {
        // Disconnect the sync bot when finished
        client.destroy(); 
        process.exit(0);
    }
});

// Start the script
client.login(process.env.DISCORD_TOKEN);
