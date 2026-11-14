const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { viewPainel } = require('../ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o painel de moderação (só você vê)')
    .setDMPermission(false),

  async execute(interaction, { dono }) {
    await interaction.reply({
      ...viewPainel(interaction.guild, dono),
      flags: MessageFlags.Ephemeral,
    });
  },
};
