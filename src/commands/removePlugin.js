const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { hasAdminRole } = require('../config/roles');
const { checkCooldown, setCooldown } = require('../utils/cooldowns');
const { env } = require('../config/env');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeplugin')
    .setDescription('Remove a plugin from the server'),

  async execute(interaction) {
    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const cooldown = checkCooldown(interaction.user.id, 'removeplugin');
    if (cooldown) {
      return interaction.reply({ content: `Cooldown active. Try again in ${cooldown} seconds.`, ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const pluginsDir = env.PLUGINS_DIR;
      const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.jar'));

      if (files.length === 0) {
        return interaction.editReply({ content: 'No plugins found in the plugins directory.' });
      }

      const options = files.map(file => ({
        label: file,
        value: file
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('remove_plugin_select')
        .setPlaceholder('Select a plugin to remove')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle('Remove Plugin')
        .setDescription('Select a plugin to remove from the server. This will restart the server after removal.')
        .setColor(0xffa500);

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to list plugins.' });
    }
  }
};