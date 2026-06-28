function buildConversationWindow(messages, index, windowSize = 2) {
    const start = Math.max(0, index - windowSize);
    const end = Math.min(messages.length, index + windowSize + 1);

    return messages
        .slice(start, end)
        .map((msg) => `${msg.author.username}: ${msg.content}`)
        .join('\n');
}

function isHumanTextMessage(msg) {
    return !msg.author.bot && msg.content && msg.content.trim() !== '';
}

async function fetchMessagesSince(channel, lastSyncedMessageId = null) {
    const rawMessages = [];
    let before;
    let reachedLastSyncedMessage = false;

    while (!reachedLastSyncedMessage) {
        const options = { limit: 100 };
        if (before) options.before = before;

        const batch = await channel.messages.fetch(options);
        if (batch.size === 0) break;

        const messages = Array.from(batch.values())
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp);

        for (const msg of messages) {
            if (lastSyncedMessageId && msg.id === lastSyncedMessageId) {
                reachedLastSyncedMessage = true;
                break;
            }

            rawMessages.push(msg);
        }

        before = messages[messages.length - 1].id;
        if (batch.size < 100) break;
    }

    return rawMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

async function saveMessageEmbeddings({ supabase, embeddingModel, messages }) {
    const humanMessages = messages
        .filter(isHumanTextMessage)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let savedCount = 0;

    for (let index = 0; index < humanMessages.length; index++) {
        const msg = humanMessages[index];
        const textToEmbed = buildConversationWindow(humanMessages, index);
        const result = await embeddingModel.embedContent(textToEmbed);
        const vector = result.embedding.values;

        const { error } = await supabase
            .from('discord_logs')
            .upsert({
                id: msg.id,
                content: textToEmbed,
                guild_id: msg.guild.id,
                channel_id: msg.channel.id,
                author_id: msg.author.id,
                author_username: msg.author.username,
                message_created_at: msg.createdAt.toISOString(),
                embedding: vector
            });

        if (error) {
            console.error(`Error saving message ${msg.id} from ${msg.author.username}:`, error.message);
        } else {
            savedCount++;
        }
    }

    return savedCount;
}

async function syncGuildChannel({ supabase, embeddingModel, channel, lastSyncedMessageId = null }) {
    const messages = await fetchMessagesSince(channel, lastSyncedMessageId);
    const savedCount = await saveMessageEmbeddings({ supabase, embeddingModel, messages });
    const newestMessage = messages[messages.length - 1];

    if (newestMessage) {
        const { error } = await supabase
            .from('guild_settings')
            .update({
                last_synced_message_id: newestMessage.id,
                last_synced_at: new Date().toISOString()
            })
            .eq('guild_id', channel.guild.id);

        if (error) {
            console.error(`Error updating sync state for guild ${channel.guild.id}:`, error.message);
        }
    }

    return {
        fetchedCount: messages.length,
        savedCount,
        newestMessageId: newestMessage?.id || lastSyncedMessageId
    };
}

async function syncConfiguredGuild({ supabase, embeddingModel, client, setting }) {
    if (!setting.help_channel_id) {
        return { skipped: true, reason: 'No help channel configured' };
    }

    const channel = await client.channels.fetch(setting.help_channel_id);
    if (!channel || !channel.isTextBased() || !channel.messages) {
        return { skipped: true, reason: 'Configured help channel is not readable' };
    }

    return syncGuildChannel({
        supabase,
        embeddingModel,
        channel,
        lastSyncedMessageId: setting.last_synced_message_id
    });
}

module.exports = {
    fetchMessagesSince,
    saveMessageEmbeddings,
    syncConfiguredGuild,
    syncGuildChannel
};
