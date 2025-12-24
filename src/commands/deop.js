const { SlashCommandBuilder } = require('discord.js');
const { hasAdminRole } = require('../config/roles');
const { validateUsername } = require('../utils/validators');
const rconService = require('../services/rconService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deop')
    .setDescription('Deop a player')
    .addStringOption(option => option.setName('username').setDescription('Player username').setRequired(true)),

  async execute(interaction) {
    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const username = interaction.options.getString('username');
    if (!validateUsername(username)) {
      return interaction.reply({ content: 'Invalid username.', ephemeral: true });
    }

    await interaction.deferReply();

    const response = await rconService.sendCommand(`deop ${username}`);
    await interaction.editReply({ content: response || 'Command executed.' });
  }
};