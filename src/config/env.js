require('dotenv').config();

const requiredEnvVars = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'ADMIN_ROLE_ID',
  'MOD_ROLE_ID',
  'NOTIFICATION_CHANNEL_ID',
  'DISCORD_WEBHOOK_URL',
  'RCON_HOST',
  'RCON_PORT',
  'RCON_PASSWORD',
  'MINECRAFT_SERVICE',
  'PLUGINS_DIR',
  'LOGS_DIR'
];

function validateEnv() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (isNaN(parseInt(process.env.RCON_PORT))) {
    throw new Error('RCON_PORT must be a number');
  }
}

module.exports = {
  validateEnv,
  env: process.env
};