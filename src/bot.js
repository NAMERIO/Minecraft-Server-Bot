const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { env } = require('./config/env');
const { POLL_INTERVAL_MS, SHUTDOWN_RESET_MS } = require('./constants');
const systemdService = require('./services/systemdService');
const rconService = require('./services/rconService');
const { getPendingConfirmation, clearPendingConfirmation } = require('./utils/confirmations');
const { setCooldown } = require('./utils/cooldowns');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let lastOnline = false;
let lastPlayerList = [];
let intentionalShutdown = 0;

async function registerCommands(commands) {
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  setInterval(async () => {
    const channel = client.channels.cache.get(env.NOTIFICATION_CHANNEL_ID);
    if (!channel) return;

    const online = await systemdService.isActive();
    if (online !== lastOnline) {
      if (!online && intentionalShutdown === 0) {
        channel.send('**Server Crash Detected!** The server went offline unexpectedly.');
      } else {
        channel.send(`Server is now **${online ? 'online' : 'offline'}**.`);
      }
      lastOnline = online;
    }

    if (online) {
      const status = await rconService.getServerStatus();
      if (JSON.stringify(status.playerList.sort()) !== JSON.stringify(lastPlayerList.sort())) {
        const joined = status.playerList.filter(p => !lastPlayerList.includes(p));
        const left = lastPlayerList.filter(p => !status.playerList.includes(p));
        if (joined.length) channel.send(`➡️ Players joined: ${joined.join(', ')}`);
        if (left.length) channel.send(`⬅️ Players left: ${left.join(', ')}`);
        lastPlayerList = [...status.playerList];
      }
    }
    if (intentionalShutdown && Date.now() - intentionalShutdown > SHUTDOWN_RESET_MS) {
      intentionalShutdown = 0;
    }
  }, POLL_INTERVAL_MS);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
  } else if (interaction.isButton()) {
    const pending = getPendingConfirmation(interaction.user.id);
    if (!pending) return interaction.reply({ content: 'No pending confirmation.', ephemeral: true });

    if (interaction.customId === 'cancel') {
      clearPendingConfirmation(interaction.user.id);
      return interaction.update({ content: 'Cancelled.', embeds: [], components: [] });
    }

    if (interaction.customId === `confirm_${pending.command}`) {
      clearPendingConfirmation(interaction.user.id);
      setCooldown(interaction.user.id, pending.command);
      intentionalShutdown = Date.now();
      try {
        if (pending.command === 'stop') {
          await systemdService.stop();
          await interaction.update({ content: 'Server stopping...', embeds: [], components: [] });
        } else if (pending.command === 'restart') {
          if (env.BACKUP_SCRIPT) {
            const { execFile } = require('child_process');
            execFile(env.BACKUP_SCRIPT, (error) => {
              if (error) console.error('Backup failed:', error);
            });
          }
          await rconService.sendCommand('save-all');
          await new Promise(resolve => setTimeout(resolve, 5000));
          await systemdService.restart();
          await interaction.update({ content: 'Server restarting...', embeds: [], components: [] });
        }
      } catch (error) {
        await interaction.update({ content: 'Operation failed.', embeds: [], components: [] });
      }
    }
  }
});

module.exports = {
  client,
  registerCommands
};