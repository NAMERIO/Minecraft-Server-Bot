const { SlashCommandBuilder } = require('discord.js');
const { hasAdminRole } = require('../config/roles');
const { checkCooldown, setCooldown } = require('../utils/cooldowns');
const { sendConfirmation } = require('../utils/confirmations');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the Minecraft server'),

  async execute(interaction) {
    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const cooldown = checkCooldown(interaction.user.id, 'restart');
    if (cooldown) {
      return interaction.reply({ content: `Cooldown active. Try again in ${cooldown} seconds.`, ephemeral: true });
    }

    await sendConfirmation(interaction, 'restart');
  }
};