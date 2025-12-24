const { SlashCommandBuilder } = require('discord.js');
const { hasModRole } = require('../config/roles');
const rconService = require('../services/rconService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('players')
    .setDescription('List online players'),

  async execute(interaction) {
    if (!hasModRole(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const list = await rconService.sendCommand('list');
    await interaction.editReply({ content: list || 'Unable to get player list.' });
  }
};