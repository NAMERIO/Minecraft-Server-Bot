const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { hasAdminRole } = require('../config/roles');
const { checkCooldown } = require('../utils/cooldowns');
const { env } = require('../config/env');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removemod')
    .setDescription('Remove a mod from the server'),

  async execute(interaction) {
    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    const cooldown = checkCooldown(interaction.user.id, 'removemod');
    if (cooldown) {
      return interaction.reply({ content: `Cooldown active. Try again in ${cooldown} seconds.`, ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const modsDir = env.MODS_DIR;
      const files = fs.readdirSync(modsDir).filter(file => file.endsWith('.jar'));

      if (files.length === 0) {
        return interaction.editReply({ content: 'No mods found in the mods directory.' });
      }

      const options = files.map(file => ({
        label: file.length > 100 ? file.substring(0, 97) + '...' : file,
        value: file
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('remove_mod_select')
        .setPlaceholder('Select a mod to remove')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle('Remove Mod')
        .setDescription('Select a mod to remove from the server. This will restart the server after removal.')
        .setColor(0xffa500);

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      await interaction.editReply({ content: 'Failed to list mods.' });
    }
  }
};
