async function withRetry(fn, retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === retries) throw error;
            console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, error.message);
            await new Promise((res) => setTimeout(res, delayMs * attempt));
        }
    }
}

function isTrustedMember(msg, trustedRoleId) {
    if (!msg.member) return false;
    if (msg.member.id === msg.guild.ownerId) return true;
    if (trustedRoleId && msg.member.roles.cache.has(trustedRoleId)) return true;
    return false;
}

function buildEmbedText(msg, messageMap) {
    const referencedId = msg.reference?.messageId;
    if (!referencedId) return null;
    const referencedMsg = messageMap.get(referencedId);
    if (!referencedMsg) return null;
    return `Q (${referencedMsg.author.username}): ${referencedMsg.content}\nA (${msg.author.username}): ${msg.content}`;
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

async function saveMessageEmbeddings({ supabase, embeddingModel, messages, trustedRoleId }) {
    const humanMessages = messages
        .filter(isHumanTextMessage)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const messageMap = new Map(messages.map((m) => [m.id, m]));

    let savedCount = 0;

    for (const msg of humanMessages) {
        if (!isTrustedMember(msg, trustedRoleId)) continue;

        const textToEmbed = buildEmbedText(msg, messageMap);
        if (!textToEmbed) continue;

        const result = await withRetry(() => embeddingModel.embedContent(textToEmbed));
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

async function syncGuildChannel({ supabase, embeddingModel, channel, lastSyncedMessageId = null, trustedRoleId = null }) {
    const messages = await fetchMessagesSince(channel, lastSyncedMessageId);
    const savedCount = await saveMessageEmbeddings({ supabase, embeddingModel, messages, trustedRoleId });
    const newestMessage = messages[messages.length - 1];

    if (newestMessage) {
        const { error } = await supabase
            .from('guild_channels')
            .update({
                last_synced_message_id: newestMessage.id,
                last_synced_at: new Date().toISOString()
            })
            .eq('guild_id', channel.guild.id)
            .eq('channel_id', channel.id);

        if (error) {
            console.error(`Error updating sync state for channel ${channel.id} in guild ${channel.guild.id}:`, error.message);
        }
    }

    return {
        fetchedCount: messages.length,
        savedCount,
        newestMessageId: newestMessage?.id || lastSyncedMessageId
    };
}

async function syncConfiguredGuild({ supabase, embeddingModel, client, channelRow, trustedRoleId }) {
    const channel = await client.channels.fetch(channelRow.channel_id).catch(() => null);
    if (!channel || !channel.isTextBased() || !channel.messages) {
        return { skipped: true, reason: 'Configured help channel is not readable' };
    }

    return syncGuildChannel({
        supabase,
        embeddingModel,
        channel,
        lastSyncedMessageId: channelRow.last_synced_message_id,
        trustedRoleId: trustedRoleId || null
    });
}

module.exports = {
    fetchMessagesSince,
    saveMessageEmbeddings,
    syncConfiguredGuild,
    syncGuildChannel
};
