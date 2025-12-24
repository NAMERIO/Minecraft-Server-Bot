const { SlashCommandBuilder } = require('discord.js');
const { hasAdminRole } = require('../config/roles');
const systemdService = require('../services/systemdService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start the Minecraft server'),

  async execute(interaction) {
    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    try {
      await systemdService.start();
      await interaction.reply({ content: 'Server starting...' });
    } catch (error) {
      await interaction.reply({ content: 'Failed to start server.', ephemeral: true });
    }
  }
};