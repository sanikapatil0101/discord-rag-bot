module.exports = {
    apps: [
        {
            name: 'discord-rag-bot',
            script: 'index.js',
            restart_delay: 5000,
            max_restarts: 10,
            watch: false,
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};
