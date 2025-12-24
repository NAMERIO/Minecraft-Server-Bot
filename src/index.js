const { validateEnv } = require('./config/env');
const { client } = require('./bot');

// Validate environment
validateEnv();

// Login
client.login(process.env.DISCORD_TOKEN);