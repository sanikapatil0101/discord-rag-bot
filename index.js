require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cron = require('node-cron');

// 1. Initialize API Clients from your .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// MUST USE THESE EXACT MODELS
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
const chatModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

const requiredEnvVars = [
    'DISCORD_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'GEMINI_API_KEY',
    'HELP_CHANNEL_ID'
];

function buildConversationWindow(messages, index, windowSize = 2) {
    const start = Math.max(0, index - windowSize);
    const end = Math.min(messages.length, index + windowSize + 1);

    return messages
        .slice(start, end)
        .map((msg) => `${msg.author.username}: ${msg.content}`)
        .join('\n');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}! Bot is ready.`);
    
    // FEATURE 1: CONTINUOUS DATA INGESTION (Runs every 24 hours at midnight)
    cron.schedule('0 0 * * *', async () => {
        console.log("⏰ Running daily sync cron job...");
        try {
            const channelId = process.env.HELP_CHANNEL_ID;
            const channel = await client.channels.fetch(channelId);
            
            if (!channel) return console.error("Could not find Help Channel");

            // Fetch last 50 messages to keep DB updated
            const messages = await channel.messages.fetch({ limit: 50 });
            let count = 0;
            const humanMessages = Array.from(messages.values())
                .filter((msg) => !msg.author.bot && msg.content && msg.content.trim() !== '')
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            for (let index = 0; index < humanMessages.length; index++) {
                const msg = humanMessages[index];
                const textToEmbed = buildConversationWindow(humanMessages, index);
                
                // Vectorize the message
                const result = await embeddingModel.embedContent(textToEmbed);
                const vector = result.embedding.values;

                // Save to Supabase
                const { error } = await supabase
                    .from('discord_logs')
                    .upsert({ // Upsert prevents duplicate messages if we overlap
                        id: msg.id, 
                        content: textToEmbed,
                        channel_id: msg.channel.id,
                        embedding: vector
                    });

                if (!error) count++;
            }
            console.log(`✅ Daily sync complete. Synced ${count} new messages.`);
        } catch (err) {
            console.error("❌ Cron sync failed:", err);
        }
    });
});

// FEATURE 2: RAG Q&A RESPONDER
client.on('messageCreate', async (message) => {
    // Ignore other bots or empty messages
    if (message.author.bot) return;
    if (!message.content) {
        console.log("Received a message, but Discord did not include message content.");
        return;
    }

    // Check if someone tagged the bot (e.g. "@SupportBot how do I login?")
    if (message.mentions.has(client.user)) {
        try {
            // Remove the bot mention from the question text
            const userQuestion = message.content
                .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
                .trim();

            console.log(`Question received from ${message.author.username}: ${userQuestion}`);

            if (!userQuestion) {
                await message.reply("Please ask a question after mentioning me.");
                return;
            }
            
            // 1. Vectorize the user's question
            const embedResult = await embeddingModel.embedContent(userQuestion);
            const questionVector = embedResult.embedding.values;

            // 2. Perform Similarity Search in Supabase
            // Note: This requires the match_documents SQL function in Supabase
            const { data: matchedDocs, error } = await supabase.rpc('match_documents', {
                query_embedding: questionVector,
                match_threshold: 0.1, // Lower value returns more possible matches.
                match_count: 8
            });

            if (error) throw error;
            console.log(`Supabase returned ${matchedDocs?.length || 0} matching messages.`);
            console.log(
                (matchedDocs || [])
                    .map((doc, index) => `Match ${index + 1}: ${Number(doc.similarity).toFixed(3)} ${doc.content.slice(0, 120).replace(/\s+/g, ' ')}`)
                    .join('\n')
            );

            if (!matchedDocs || matchedDocs.length === 0) {
                await message.reply("I couldn't find the answer to this in the server history. Could a human admin step in and help out?");
                return;
            }

            // 3. Compile the Context
            const contextText = matchedDocs
                .map((doc, index) => `Source ${index + 1} (similarity ${Number(doc.similarity).toFixed(3)}):\n${doc.content}`)
                .join('\n\n');

            // 4. Build the Strict System Prompt
            const prompt = `
            You are an autonomous Discord community support bot. Your job is to instantly answer user questions by analyzing historical server conversations.

            <CONTEXT_FROM_DATABASE>
            ${contextText}
            </CONTEXT_FROM_DATABASE>

            <RULES>
            1. STRICT FACTUALITY: You must answer the user's question using ONLY the information provided in the <CONTEXT_FROM_DATABASE> block above. 
            2. NO EXTERNAL KNOWLEDGE: Do not rely on your pre-trained knowledge. If the answer is not explicitly stated or heavily implied in the context, you must refuse to answer.
            3. HANDLING MISSING DATA: If the context does not contain the answer, reply exactly with: "I couldn't find the answer to this in the server history. Could a human admin step in and help out?"
            4. TONE & FORMATTING: Keep your answer friendly, concise, and easy to read. Use Discord markdown formatting (like **bolding** key terms). Do not act robotic.
            </RULES>

            User's Question: ${userQuestion}
            Your Answer:
            `;

            // 5. Generate the LLM Answer
            const chatResult = await chatModel.generateContent(prompt);
            const aiAnswer = chatResult.response.text();
            console.log("Generated answer successfully.");

            // 6. Send the reply back to Discord
            await message.reply(aiAnswer);

        } catch (error) {
            console.error("❌ Error handling question:", error);
            await message.reply("Sorry, my brain is having a little trouble connecting to the database right now!");
        }
    }
});

// Start the bot
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
    console.error(`Missing required .env value(s): ${missingEnvVars.join(', ')}`);
} else {
    client.login(process.env.DISCORD_TOKEN);
}
