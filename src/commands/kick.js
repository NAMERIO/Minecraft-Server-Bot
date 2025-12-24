const { SlashCommandBuilder } = require('discord.js');
const { hasModRole } = require('../config/roles');
const { validateUsername } = require('../utils/validators');
const rconService = require('../services/rconService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a player')
    .addStringOption(option => option.setName('username').setDescription('Player username').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!hasModRole(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const username = interaction.options.getString('username');
    const reason = interaction.options.getString('reason') || '';
    if (!validateUsername(username)) {
      return interaction.reply({ content: 'Invalid username.', ephemeral: true });
    }

    await interaction.deferReply();

    const response = await rconService.sendCommand(`kick ${username} ${reason}`);
    await interaction.editReply({ content: response || 'Player kicked.' });
  }
};