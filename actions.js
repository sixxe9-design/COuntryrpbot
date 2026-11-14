const { EmbedBuilder } = require('discord.js');
const { adicionarAdvertencia, listarAdvertencias } = require('./store');
const { ehDono } = require('./permissions');
const { COR } = require('./ui');

// Devolve um texto de erro se não puder advertir essa pessoa, ou null se estiver tudo certo.
function validarAlvo(guild, alvo, autorId) {
  if (alvo.bot) return 'Não dá pra advertir bots.';
  if (alvo.id === autorId) return 'Você não pode advertir a si mesmo.';
  if (ehDono(guild, alvo.id)) return 'Não é possível advertir o dono do bot.';
  return null;
}

async function registrarLog(guild, embed) {
  const canalId = process.env.LOG_CHANNEL_ID;
  if (!canalId) return;
  const canal = await guild.channels.fetch(canalId).catch(() => null);
  if (canal && canal.isTextBased()) {
    await canal.send({ embeds: [embed] }).catch(() => {});
  }
}

async function aplicarAdvertencia(guild, alvo, motivo, autor) {
  adicionarAdvertencia(alvo.id, motivo, autor.id);
  const total = listarAdvertencias(alvo.id).length;

  // Tenta avisar a pessoa por DM (pode falhar se ela fechou as mensagens diretas)
  const dmOk = await alvo
    .send({
      embeds: [
        new EmbedBuilder()
          .setColor(COR.amarelo)
          .setTitle('⚠️ Você recebeu uma advertência')
          .setDescription(`Servidor: **${guild.name}**`)
          .addFields(
            { name: 'Motivo', value: motivo },
            { name: 'Total de advertências', value: `${total}`, inline: true }
          )
          .setTimestamp(),
      ],
    })
    .then(() => true)
    .catch(() => false);

  await registrarLog(
    guild,
    new EmbedBuilder()
      .setColor(COR.amarelo)
      .setTitle('⚠️ Advertência aplicada')
      .addFields(
        { name: 'Usuário', value: `<@${alvo.id}> (\`${alvo.id}\`)`, inline: true },
        { name: 'Aplicada por', value: `<@${autor.id}>`, inline: true },
        { name: 'Total', value: `${total}`, inline: true },
        { name: 'Motivo', value: motivo }
      )
      .setTimestamp()
  );

  return { total, dmOk };
}

module.exports = { validarAlvo, aplicarAdvertencia, registrarLog };
