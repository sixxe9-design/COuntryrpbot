require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder } = require('discord.js');
const { temAcesso, ehDono } = require('./permissions');
const {
  listarAdvertencias,
  removerUltimaAdvertencia,
  limparAdvertencias,
  lerConfig,
  salvarConfig,
} = require('./store');
const {
  COR,
  viewPainel,
  viewPesquisar,
  viewAdvertir,
  viewPerfil,
  viewHistorico,
  viewPermissoes,
  viewErro,
  modalAdvertencia,
  modalBuscarId,
} = require('./ui');
const { validarAlvo, aplicarAdvertencia, registrarLog } = require('./actions');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const pastaComandos = path.join(__dirname, 'commands');
for (const arquivo of fs.readdirSync(pastaComandos).filter((f) => f.endsWith('.js'))) {
  const comando = require(path.join(pastaComandos, arquivo));
  client.commands.set(comando.data.name, comando);
}

const EFEMERO = MessageFlags.Ephemeral;

// Mostra "carregando" na própria mensagem (ou cria uma resposta privada, se vier de um comando)
async function iniciar(i) {
  const vemDeMensagem = i.isMessageComponent() || (i.isModalSubmit() && i.isFromMessage());
  if (vemDeMensagem) await i.deferUpdate();
  else await i.deferReply({ flags: EFEMERO });
}

async function negar(i, texto = '❌ Só o dono do bot pode fazer isso.') {
  return i.reply({ content: texto, flags: EFEMERO });
}

// ---------- BOTÕES ----------
async function tratarBotao(i, dono) {
  const id = i.customId;

  if (id === 'painel_pesquisar') return i.update(viewPesquisar());
  if (id === 'painel_advertir') return i.update(viewAdvertir());
  if (id === 'voltar_painel') return i.update(viewPainel(i.guild, dono));

  if (id === 'painel_permissoes') {
    if (!dono) return negar(i);
    return i.update(viewPermissoes(i.guild));
  }

  if (id === 'buscar_id') return i.showModal(modalBuscarId());

  if (id.startsWith('perfil_')) {
    await iniciar(i);
    return i.editReply(await viewPerfil(i.guild, id.slice('perfil_'.length), { dono }));
  }

  if (id.startsWith('adv_aplicar_')) {
    const userId = id.slice('adv_aplicar_'.length);
    const alvo = await client.users.fetch(userId).catch(() => null);
    if (!alvo) return i.reply({ content: '❌ Usuário não encontrado.', flags: EFEMERO });
    const erro = validarAlvo(i.guild, alvo, i.user.id);
    if (erro) return i.reply({ content: `❌ ${erro}`, flags: EFEMERO });
    return i.showModal(modalAdvertencia(userId, alvo.username));
  }

  if (id.startsWith('adv_historico_')) {
    await iniciar(i);
    return i.editReply(await viewHistorico(i.guild, id.slice('adv_historico_'.length)));
  }

  if (id.startsWith('adv_remover_')) {
    const userId = id.slice('adv_remover_'.length);
    await iniciar(i);
    const removida = removerUltimaAdvertencia(userId);
    if (removida) {
      await registrarLog(
        i.guild,
        new EmbedBuilder()
          .setColor(COR.verde)
          .setTitle('🗑️ Advertência removida')
          .addFields(
            { name: 'Usuário', value: `<@${userId}> (\`${userId}\`)`, inline: true },
            { name: 'Removida por', value: `<@${i.user.id}>`, inline: true },
            { name: 'Motivo da advertência removida', value: removida.motivo }
          )
          .setTimestamp()
      );
    }
    const aviso = removida ? '🗑️ Última advertência removida.' : 'Esse usuário não tem advertências.';
    return i.editReply(await viewPerfil(i.guild, userId, { dono, aviso }));
  }

  if (id.startsWith('adv_limpar_')) {
    if (!dono) return negar(i);
    const userId = id.slice('adv_limpar_'.length);
    await iniciar(i);
    const quantidade = limparAdvertencias(userId);
    if (quantidade > 0) {
      await registrarLog(
        i.guild,
        new EmbedBuilder()
          .setColor(COR.verde)
          .setTitle('🧹 Advertências limpas')
          .addFields(
            { name: 'Usuário', value: `<@${userId}> (\`${userId}\`)`, inline: true },
            { name: 'Limpas por', value: `<@${i.user.id}>`, inline: true },
            { name: 'Quantidade', value: `${quantidade}`, inline: true }
          )
          .setTimestamp()
      );
    }
    return i.editReply(await viewPerfil(i.guild, userId, { dono, aviso: `🧹 ${quantidade} advertência(s) apagada(s).` }));
  }
}

// ---------- MENUS DE SELEÇÃO ----------
async function tratarMenu(i, dono) {
  const id = i.customId;

  if (id === 'sel_pesquisar') {
    await iniciar(i);
    return i.editReply(await viewPerfil(i.guild, i.values[0], { dono }));
  }

  if (id === 'sel_advertir') {
    const userId = i.values[0];
    const alvo = await client.users.fetch(userId).catch(() => null);
    if (!alvo) return i.reply({ content: '❌ Usuário não encontrado.', flags: EFEMERO });
    const erro = validarAlvo(i.guild, alvo, i.user.id);
    if (erro) return i.reply({ content: `❌ ${erro}`, flags: EFEMERO });
    return i.showModal(modalAdvertencia(userId, alvo.username));
  }

  if (id === 'sel_perm_cargos' || id === 'sel_perm_usuarios') {
    if (!dono) return negar(i);
    const config = lerConfig();
    if (id === 'sel_perm_cargos') config.cargos = i.values;
    else config.usuarios = i.values;
    salvarConfig(config);
    return i.update(viewPermissoes(i.guild));
  }
}

// ---------- JANELAS (MODAIS) ----------
async function tratarModal(i, dono) {
  const id = i.customId;

  if (id === 'modal_buscar_id') {
    const bruto = i.fields.getTextInputValue('id_usuario');
    const achado = bruto.match(/\d{15,25}/);
    await iniciar(i);
    if (!achado) return i.editReply(viewErro('❌ Isso não parece um ID válido. O ID tem só números (uns 17 a 19 dígitos).'));
    return i.editReply(await viewPerfil(i.guild, achado[0], { dono }));
  }

  if (id.startsWith('modal_adv_')) {
    const userId = id.slice('modal_adv_'.length);
    const motivo = i.fields.getTextInputValue('motivo').trim();
    await iniciar(i);

    const alvo = await client.users.fetch(userId).catch(() => null);
    if (!alvo) return i.editReply(viewErro('❌ Usuário não encontrado.'));
    const erro = validarAlvo(i.guild, alvo, i.user.id);
    if (erro) return i.editReply(viewErro(`❌ ${erro}`));

    const { total, dmOk } = await aplicarAdvertencia(i.guild, alvo, motivo, i.user);
    const aviso =
      `✅ Advertência aplicada em <@${alvo.id}> (total: ${total}).` +
      (dmOk ? '' : '\n⚠️ Não consegui avisar por DM (mensagens diretas fechadas).');
    return i.editReply(await viewPerfil(i.guild, userId, { dono, aviso }));
  }
}

// ---------- ENTRADA ----------
client.on('interactionCreate', async (i) => {
  try {
    if (!i.inGuild()) {
      if (i.isRepliable()) await i.reply({ content: 'Use esse bot dentro do servidor.', flags: EFEMERO });
      return;
    }

    if (!i.guild) {
      if (i.isRepliable()) await i.reply({ content: '❌ Não consegui carregar o servidor. Tenta de novo.', flags: EFEMERO });
      return;
    }

    // Toda interação passa por aqui: se tirarem seu acesso, os botões antigos param de funcionar.
    if (!temAcesso(i.guild, i.member)) {
      await i.reply({ content: '❌ Você não tem permissão para usar esse bot.', flags: EFEMERO });
      return;
    }

    const dono = ehDono(i.guild, i.user.id);

    if (i.isChatInputCommand()) {
      const comando = client.commands.get(i.commandName);
      if (comando) await comando.execute(i, { dono });
    } else if (i.isButton()) {
      await tratarBotao(i, dono);
    } else if (i.isAnySelectMenu()) {
      await tratarMenu(i, dono);
    } else if (i.isModalSubmit()) {
      await tratarModal(i, dono);
    }
  } catch (erro) {
    console.error(erro);
    const resposta = { content: '❌ Deu algum erro. Tenta de novo.', flags: EFEMERO };
    try {
      if (i.deferred || i.replied) await i.followUp(resposta);
      else await i.reply(resposta);
    } catch {
      // se nem isso der, não tem mais o que fazer
    }
  }
});

client.once('clientReady', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
