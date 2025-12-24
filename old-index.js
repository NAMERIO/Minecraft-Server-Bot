require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Rcon } = require('rcon-client');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let lastOnline = false;
let lastPlayerList = [];
let intentionalShutdown = false;
const cooldowns = new Map();
const pendingConfirmations = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Get Minecraft server status'),
  new SlashCommandBuilder()
    .setName('players')
    .setDescription('List online players'),
  new SlashCommandBuilder()
    .setName('op')
    .setDescription('Op a player')
    .addStringOption(option => option.setName('username').setDescription('Player username').setRequired(true)),
  new SlashCommandBuilder()
    .setName('deop')
    .setDescription('Deop a player')
    .addStringOption(option => option.setName('username').setDescription('Player username').setRequired(true)),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message to the server')
    .addStringOption(option => option.setName('message').setDescription('Message').setRequired(true)),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a player')
    .addStringOption(option => option.setName('username').setDescription('Player username').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a player')
    .addStringOption(option => option.setName('username').setDescription('Player username').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start the Minecraft server'),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the Minecraft server'),
  new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the Minecraft server'),
  new SlashCommandBuilder()
    .setName('addplugin')
    .setDescription('Add a plugin from URL')
    .addStringOption(option => option.setName('url').setDescription('Plugin JAR URL').setRequired(true)),
  new SlashCommandBuilder()
    .setName('lastlogs')
    .setDescription('Get last 10 log lines')
    .addIntegerOption(option => option.setName('lines').setDescription('Number of lines').setRequired(false).setMinValue(1).setMaxValue(50)),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

async function rconCommand(command) {
  const rcon = new Rcon({
    host: process.env.RCON_HOST,
    port: parseInt(process.env.RCON_PORT),
    password: process.env.RCON_PASSWORD,
  });
  try {
    await rcon.connect();
    const response = await rcon.send(command);
    await rcon.end();
    return response;
  } catch (error) {
    console.error('RCON Error:', error);
    return null;
  }
}

function systemctlCommand(action) {
  return new Promise((resolve, reject) => {
    exec(`systemctl ${action} ${process.env.MINECRAFT_SERVICE}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

function isServerOnline() {
  return new Promise((resolve) => {
    exec(`systemctl is-active ${process.env.MINECRAFT_SERVICE}`, (error, stdout) => {
      resolve(stdout.trim() === 'active');
    });
  });
}

async function getServerStatus() {
  const online = await isServerOnline();
  if (!online) {
    return { online: false };
  }
  const list = await rconCommand('list');
  const version = await rconCommand('version');
  let players = 'Unknown';
  let playerList = [];
  if (list) {
    const match = list.match(/There are (\d+) of (\d+) players online: (.+)/);
    if (match) {
      players = `${match[1]}/${match[2]}`;
      playerList = match[3].split(', ');
    }
  }
  return { online: true, players, playerList, version: version || 'Unknown' };
}

function checkCooldown(userId, command, cooldownMs = 300000) {
  const userCooldowns = cooldowns.get(userId) || {};
  const lastUsed = userCooldowns[command];
  if (lastUsed && Date.now() - lastUsed < cooldownMs) {
    return Math.ceil((cooldownMs - (Date.now() - lastUsed)) / 1000);
  }
  return 0;
}

function setCooldown(userId, command) {
  const userCooldowns = cooldowns.get(userId) || {};
  userCooldowns[command] = Date.now();
  cooldowns.set(userId, userCooldowns);
}

async function sendConfirmation(interaction, command, options) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${command}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  const embed = new EmbedBuilder()
    .setTitle(`Confirm ${command.toUpperCase()}`)
    .setDescription(`Are you sure you want to ${command} the server?`)
    .setColor(0xffa500);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

  pendingConfirmations.set(interaction.user.id, { command, options });
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  setInterval(async () => {
    const status = await getServerStatus();
    const channel = client.channels.cache.get(process.env.NOTIFICATION_CHANNEL_ID);
    if (!channel) return;

    if (status.online !== lastOnline) {
      if (!status.online && !intentionalShutdown) {
        channel.send('🚨 **Server Crash Detected!** The server went offline unexpectedly.');
      } else {
        channel.send(`🔄 Server is now **${status.online ? 'online' : 'offline'}**.`);
      }
      lastOnline = status.online;
    }

    if (status.online && JSON.stringify(status.playerList.sort()) !== JSON.stringify(lastPlayerList.sort())) {
      const joined = status.playerList.filter(p => !lastPlayerList.includes(p));
      const left = lastPlayerList.filter(p => !status.playerList.includes(p));
      if (joined.length) channel.send(`➡️ Players joined: ${joined.join(', ')}`);
      if (left.length) channel.send(`⬅️ Players left: ${left.join(', ')}`);
      lastPlayerList = [...status.playerList];
    }
    if (intentionalShutdown && Date.now() - intentionalShutdown > 120000) {
      intentionalShutdown = false;
    }
  }, 60000);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction);
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  }
});

async function handleCommand(interaction) {
  const member = interaction.member;
  const hasAdmin = member.roles.cache.has(process.env.ADMIN_ROLE_ID);
  const hasMod = hasAdmin || member.roles.cache.has(process.env.MOD_ROLE_ID);

  if (!hasMod) {
    return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
  }

  try {
    switch (interaction.commandName) {
      case 'status':
        await cmdStatus(interaction);
        break;
      case 'players':
        await cmdPlayers(interaction);
        break;
      case 'op':
        if (!hasAdmin) return interaction.reply({ content: 'Admin only.', ephemeral: true });
        await cmdOp(interaction);
        break;
      case 'deop':
        if (!hasAdmin) return interaction.reply({ content: 'Admin only.', ephemeral: true });
        await cmdDeop(interaction);
        break;
      case 'say':
        await cmdSay(interaction);
        break;
      case 'kick':
        await cmdKick(interaction);
        break;
      case 'ban':
        if (!hasAdmin) return interaction.reply({ content: 'Admin only.', ephemeral: true });
        await cmdBan(interaction);
        break;
      case 'start':
        if (!hasAdmin) return interaction.reply({ content: 'Admin only.', ephemeral: true });
        await cmdStart(interaction);
        break;
      case 'stop':
        if (!hasAdmin) return interaction.reply({ content: 'Admin only.', ephemeral: true });
        const cooldown = checkCooldown(interaction.user.id, 'stop');
        if (cooldown) return interaction.reply({ content: `Cooldown active. Try again in ${cooldown} seconds.`, ephemeral: true });
        await sendConfirmation(interaction, 'stop');
        break;
      case 'restart':
        if (!hasAdmin) return interaction.reply({ content: 'Admin only.', ephemeral: true });
        const cooldownR = checkCooldown(interaction.user.id, 'restart');
        if (cooldownR) return interaction.reply({ content: `Cooldown active. Try again in ${cooldownR} seconds.`, ephemeral: true });
        await sendConfirmation(interaction, 'restart');
        break;
      case 'addplugin':
        if (!hasAdmin) return interaction.reply({ content: 'Admin only.', ephemeral: true });
        const cooldownP = checkCooldown(interaction.user.id, 'addplugin');
        if (cooldownP) return interaction.reply({ content: `Cooldown active. Try again in ${cooldownP} seconds.`, ephemeral: true });
        await cmdAddPlugin(interaction);
        break;
      case 'lastlogs':
        await cmdLastLogs(interaction);
        break;
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied) await interaction.reply({ content: 'An error occurred.', ephemeral: true });
  }
}

async function handleButton(interaction) {
  const customId = interaction.customId;
  const pending = pendingConfirmations.get(interaction.user.id);
  if (!pending) return interaction.reply({ content: 'No pending confirmation.', ephemeral: true });

  if (customId === 'cancel') {
    pendingConfirmations.delete(interaction.user.id);
    return interaction.update({ content: 'Cancelled.', embeds: [], components: [] });
  }

  if (customId === `confirm_${pending.command}`) {
    pendingConfirmations.delete(interaction.user.id);
    setCooldown(interaction.user.id, pending.command);
    if (pending.command === 'stop') {
      intentionalShutdown = Date.now();
      await systemctlCommand('stop');
      await interaction.update({ content: 'Server stopping...', embeds: [], components: [] });
    } else if (pending.command === 'restart') {
      intentionalShutdown = Date.now();
      if (process.env.BACKUP_SCRIPT) {
        exec(process.env.BACKUP_SCRIPT, (error) => {
          if (error) console.error('Backup failed:', error);
        });
      }
      await rconCommand('save-all');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await systemctlCommand('restart');
      await interaction.update({ content: 'Server restarting...', embeds: [], components: [] });
    }
  }
}
async function cmdStatus(interaction) {
  const status = await getServerStatus();
  const embed = new EmbedBuilder()
    .setTitle('Minecraft Server Status')
    .setColor(status.online ? 0x00ff00 : 0xff0000)
    .addFields(
      { name: 'Status', value: status.online ? 'Online' : 'Offline', inline: true },
      { name: 'Players', value: status.players || 'N/A', inline: true },
      { name: 'Version', value: status.version, inline: true }
    );
  if (status.playerList.length > 0) {
    embed.addFields({ name: 'Online Players', value: status.playerList.join(', ') });
  }
  await interaction.reply({ embeds: [embed] });
}

async function cmdPlayers(interaction) {
  const list = await rconCommand('list');
  await interaction.reply({ content: list || 'Unable to get player list.' });
}

async function cmdOp(interaction) {
  const username = interaction.options.getString('username');
  if (!username.match(/^[a-zA-Z0-9_]{1,16}$/)) return interaction.reply({ content: 'Invalid username.', ephemeral: true });
  const response = await rconCommand(`op ${username}`);
  await interaction.reply({ content: response || 'Command executed.' });
}

async function cmdDeop(interaction) {
  const username = interaction.options.getString('username');
  if (!username.match(/^[a-zA-Z0-9_]{1,16}$/)) return interaction.reply({ content: 'Invalid username.', ephemeral: true });
  const response = await rconCommand(`deop ${username}`);
  await interaction.reply({ content: response || 'Command executed.' });
}

async function cmdSay(interaction) {
  const message = interaction.options.getString('message');
  const response = await rconCommand(`say ${message}`);
  await interaction.reply({ content: 'Message sent.', ephemeral: true });
}

async function cmdKick(interaction) {
  const username = interaction.options.getString('username');
  const reason = interaction.options.getString('reason') || '';
  if (!username.match(/^[a-zA-Z0-9_]{1,16}$/)) return interaction.reply({ content: 'Invalid username.', ephemeral: true });
  const response = await rconCommand(`kick ${username} ${reason}`);
  await interaction.reply({ content: response || 'Player kicked.' });
}

async function cmdBan(interaction) {
  const username = interaction.options.getString('username');
  const reason = interaction.options.getString('reason') || '';
  if (!username.match(/^[a-zA-Z0-9_]{1,16}$/)) return interaction.reply({ content: 'Invalid username.', ephemeral: true });
  const response = await rconCommand(`ban ${username} ${reason}`);
  await interaction.reply({ content: response || 'Player banned.' });
}

async function cmdStart(interaction) {
  await systemctlCommand('start');
  await interaction.reply({ content: 'Server starting...' });
}

async function cmdAddPlugin(interaction) {
  const url = interaction.options.getString('url');
  const allowedDomains = ['modrinth.com', 'spigotmc.org', 'papermc.io', 'hangar.papermc.io'];
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch {
    return interaction.reply({ content: 'Invalid URL.', ephemeral: true });
  }
  if (!allowedDomains.some(domain => urlObj.hostname.includes(domain)) || !url.endsWith('.jar')) {
    return interaction.reply({ content: 'Invalid or untrusted URL.', ephemeral: true });
  }
  const filename = path.basename(urlObj.pathname);
  const dest = path.join(process.env.PLUGINS_DIR, filename);
  await interaction.deferReply();
  exec(`wget -O "${dest}" "${url}"`, async (error) => {
    if (error) {
      return interaction.editReply({ content: 'Failed to download plugin.' });
    }
    await rconCommand('save-all');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await systemctlCommand('restart');
    setCooldown(interaction.user.id, 'addplugin');
    await interaction.editReply({ content: 'Plugin added and server restarted.' });
  });
}

async function cmdLastLogs(interaction) {
  const lines = interaction.options.getInteger('lines') || 10;
  exec(`journalctl -u ${process.env.MINECRAFT_SERVICE} -n ${lines} --no-pager`, (error, stdout) => {
    if (error) {
      return interaction.reply({ content: 'Unable to get logs.', ephemeral: true });
    }
    const logs = stdout.split('\n').slice(-lines).join('\n');
    interaction.reply({ content: `\`\`\`\n${logs}\n\`\`\``, ephemeral: true });
  });
}

client.login(process.env.DISCORD_TOKEN);