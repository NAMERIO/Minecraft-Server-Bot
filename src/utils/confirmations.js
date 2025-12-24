const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const pendingConfirmations = new Map();

async function sendConfirmation(interaction, command) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${command}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  const embed = new EmbedBuilder()
    .setTitle(`Confirm ${command.toUpperCase()}`)
    .setDescription(`Are you sure you want to ${command} the server?`)
    .setColor(0xffa500);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

  pendingConfirmations.set(interaction.user.id, { command });
}

function getPendingConfirmation(userId) {
  return pendingConfirmations.get(userId);
}

function clearPendingConfirmation(userId) {
  pendingConfirmations.delete(userId);
}

module.exports = {
  sendConfirmation,
  getPendingConfirmation,
  clearPendingConfirmation
};