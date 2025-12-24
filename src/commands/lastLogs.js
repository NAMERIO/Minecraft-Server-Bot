const { SlashCommandBuilder } = require('discord.js');
const { hasModRole } = require('../config/roles');
const logService = require('../services/logService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lastlogs')
    .setDescription('Get last 10 log lines')
    .addIntegerOption(option => option.setName('lines').setDescription('Number of lines').setRequired(false).setMinValue(1).setMaxValue(50)),

  async execute(interaction) {
    if (!hasModRole(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const lines = interaction.options.getInteger('lines') || 10;

    try {
      const logs = await logService.getLastLogs(lines);
      const logLines = logs.split('\n').slice(-lines).join('\n');
      await interaction.reply({ content: `\`\`\`\n${logLines}\n\`\`\``, ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: 'Unable to get logs.', ephemeral: true });
    }
  }
};