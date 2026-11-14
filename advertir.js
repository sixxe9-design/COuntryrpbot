const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { validarAlvo, aplicarAdvertencia } = require('../actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advertir')
    .setDescription('Aplica uma advertência em um membro')
    .setDMPermission(false)
    .addUserOption((opt) => opt.setName('usuario').setDescription('Quem vai receber a advertência').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('motivo').setDescription('Motivo da advertência').setRequired(true).setMinLength(3).setMaxLength(500)
    ),

  async execute(interaction) {
    const alvo = interaction.options.getUser('usuario');
    const motivo = interaction.options.getString('motivo');

    const erro = validarAlvo(interaction.guild, alvo, interaction.user.id);
    if (erro) {
      await interaction.reply({ content: `❌ ${erro}`, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { total, dmOk } = await aplicarAdvertencia(interaction.guild, alvo, motivo, interaction.user);

    await interaction.editReply({
      content:
        `✅ Advertência aplicada em <@${alvo.id}>. Total: **${total}**.` +
        (dmOk ? '' : '\n⚠️ Não consegui avisar por DM (a pessoa deve estar com as mensagens diretas fechadas).'),
    });
  },
};
