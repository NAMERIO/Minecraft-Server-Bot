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

    await interaction.deferReply();

    try {
      await systemdService.start();
      await interaction.editReply({ content: 'Server starting...' });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to start server.' });
    }
  }
};