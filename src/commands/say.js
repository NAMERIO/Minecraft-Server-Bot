const { SlashCommandBuilder } = require('discord.js');
const { hasModRole } = require('../config/roles');
const rconService = require('../services/rconService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message to the server')
    .addStringOption(option => option.setName('message').setDescription('Message').setRequired(true)),

  async execute(interaction) {
    if (!hasModRole(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const message = interaction.options.getString('message');

    await interaction.deferReply();

    await rconService.sendCommand(`say ${message}`);
    await interaction.editReply({ content: 'Message sent.', ephemeral: true });
  }
};