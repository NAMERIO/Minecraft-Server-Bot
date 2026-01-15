const { SlashCommandBuilder } = require('discord.js');
const { hasAdminRole } = require('../config/roles');
const { checkCooldown, setCooldown } = require('../utils/cooldowns');
const modService = require('../services/modService');
const rconService = require('../services/rconService');
const systemdService = require('../services/systemdService');
const { RESTART_SAVE_DELAY_MS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmod')
    .setDescription('Add a mod from URL')
    .addStringOption(option => option.setName('url').setDescription('Mod JAR URL').setRequired(true)),

  async execute(interaction) {
    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const cooldown = checkCooldown(interaction.user.id, 'addmod');
    if (cooldown) {
      return interaction.reply({ content: `Cooldown active. Try again in ${cooldown} seconds.`, ephemeral: true });
    }

    const url = interaction.options.getString('url');

    await interaction.deferReply();

    try {
      await modService.downloadMod(url);
      await rconService.sendCommand('save-all');
      await new Promise(resolve => setTimeout(resolve, RESTART_SAVE_DELAY_MS));
      await systemdService.restart();
      setCooldown(interaction.user.id, 'addmod');
      await interaction.editReply({ content: 'Mod added and server restarted.' });
    } catch (error) {
      await interaction.editReply({ content: `Failed: ${error.message}` });
    }
  }
};
