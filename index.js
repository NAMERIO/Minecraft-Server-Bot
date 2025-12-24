const { validateEnv } = require('./src/config/env');
const { client, registerCommands } = require('./src/bot');
const fs = require('fs');
const path = require('path');

validateEnv();

const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data);
}

registerCommands(commands);
client.login(process.env.DISCORD_TOKEN);