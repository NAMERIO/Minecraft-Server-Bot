const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../config/roles');
const systemdService = require('../services/systemdService');
const rconService = require('../services/rconService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Get Minecraft server status'),

  async execute(interaction) {
    if (!hasModRole(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply();

    const online = await systemdService.isActive();
    if (!online) {
      const embed = new EmbedBuilder()
        .setTitle('Minecraft Server Status')
        .setColor(0xff0000)
        .addFields({ name: 'Status', value: 'Offline', inline: true });
      return interaction.editReply({ embeds: [embed] });
    }

    const status = await rconService.getServerStatus();
    const embed = new EmbedBuilder()
      .setTitle('Minecraft Server Status')
      .setColor(0x00ff00)
      .addFields(
        { name: 'Status', value: 'Online', inline: true },
        { name: 'Players', value: status.players, inline: true },
        { name: 'Version', value: status.version, inline: true }
      );
    if (status.playerList.length > 0) {
      embed.addFields({ name: 'Online Players', value: status.playerList.join(', ') });
    }
    await interaction.editReply({ embeds: [embed] });
  }
};