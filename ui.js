const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { listarAdvertencias, lerConfig } = require('./store');
const { donoId } = require('./permissions');

const COR = { verde: 0x2ecc71, amarelo: 0xf1c40f, vermelho: 0xe74c3c, azul: 0x5865f2 };

// ---------- AJUDANTES ----------
function ts(data) {
  return Math.floor(new Date(data).getTime() / 1000);
}

function truncar(texto, limite) {
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite - 1).trimEnd() + '…';
}

function idadeConta(data) {
  const agora = new Date();
  let anos = agora.getFullYear() - data.getFullYear();
  let meses = agora.getMonth() - data.getMonth();
  let dias = agora.getDate() - data.getDate();
  if (dias < 0) {
    meses -= 1;
    dias += new Date(agora.getFullYear(), agora.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  const partes = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`);
  return partes.join(', ');
}

function nomeServidor(guild) {
  return process.env.SERVER_NAME || guild.name;
}

function botaoVoltarPainel() {
  return new ButtonBuilder().setCustomId('voltar_painel').setLabel('Painel').setEmoji('⬅️').setStyle(ButtonStyle.Secondary);
}

// ---------- PAINEL PRINCIPAL ----------
function viewPainel(guild, dono) {
  const embed = new EmbedBuilder()
    .setColor(COR.azul)
    .setTitle(`🛡️ Painel de Moderação — ${nomeServidor(guild)}`)
    .setDescription(
      'Só você está vendo essa mensagem.\n\n' +
        '🔍 **Pesquisar usuário** — veja cargos, idade da conta, quando entrou e as advertências dele\n' +
        '⚠️ **Aplicar advertência** — escolha o membro e informe o motivo' +
        (dono ? '\n⚙️ **Permissões** — escolha quem pode usar esse bot (só você, dono, vê esse botão)' : '')
    );

  const linha = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('painel_pesquisar').setLabel('Pesquisar usuário').setEmoji('🔍').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('painel_advertir').setLabel('Aplicar advertência').setEmoji('⚠️').setStyle(ButtonStyle.Danger)
  );
  if (dono) {
    linha.addComponents(
      new ButtonBuilder().setCustomId('painel_permissoes').setLabel('Permissões').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
    );
  }

  return { content: '', embeds: [embed], components: [linha] };
}

// ---------- PESQUISA ----------
function viewPesquisar() {
  const embed = new EmbedBuilder()
    .setColor(COR.azul)
    .setTitle('🔍 Pesquisar usuário')
    .setDescription('Escolha o membro na lista abaixo (dá pra digitar o nome pra filtrar).\nSe ele não aparecer, ou já saiu do servidor, use **Buscar por ID**.');

  const seletor = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('sel_pesquisar').setPlaceholder('Selecione um usuário…').setMinValues(1).setMaxValues(1)
  );
  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('buscar_id').setLabel('Buscar por ID').setEmoji('🔎').setStyle(ButtonStyle.Secondary),
    botaoVoltarPainel()
  );

  return { content: '', embeds: [embed], components: [seletor, botoes] };
}

function viewAdvertir() {
  const embed = new EmbedBuilder()
    .setColor(COR.vermelho)
    .setTitle('⚠️ Aplicar advertência')
    .setDescription('Escolha o membro. Em seguida vai abrir uma janela pra você escrever o motivo.');

  const seletor = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('sel_advertir').setPlaceholder('Selecione quem vai receber…').setMinValues(1).setMaxValues(1)
  );
  const botoes = new ActionRowBuilder().addComponents(botaoVoltarPainel());

  return { content: '', embeds: [embed], components: [seletor, botoes] };
}

// ---------- PERFIL DO USUÁRIO ----------
async function viewPerfil(guild, userId, { aviso = '', dono = false } = {}) {
  const user = await guild.client.users.fetch(userId, { force: true }).catch(() => null);
  if (!user) {
    return viewErro('❌ Não encontrei nenhum usuário com esse ID.');
  }
  const member = await guild.members.fetch(userId).catch(() => null);
  const advs = listarAdvertencias(userId);

  const cor = advs.length >= 3 ? COR.vermelho : advs.length >= 1 ? COR.amarelo : COR.verde;

  // Cargos (sem o @everyone, do mais alto pro mais baixo)
  let cargosTexto = '—';
  let maiorCargo = '—';
  let qtdCargos = 0;
  if (member) {
    const cargos = member.roles.cache
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position);
    qtdCargos = cargos.size;
    cargosTexto = cargos.size ? truncar(cargos.map((r) => `<@&${r.id}>`).join(' '), 1000) : 'Nenhum cargo';
    maiorCargo = cargos.size ? `<@&${cargos.first().id}>` : 'Nenhum';
  }

  // Advertências (mostra as 5 mais recentes)
  let advTexto = '✅ Nenhuma advertência';
  if (advs.length) {
    const recentes = advs
      .map((a, i) => ({ ...a, n: i + 1 }))
      .slice(-5)
      .reverse();
    advTexto = recentes
      .map((a) => `**#${a.n}** ${truncar(a.motivo, 100)}\n↳ por <@${a.por}> • <t:${ts(a.em)}:d>`)
      .join('\n');
    if (advs.length > 5) advTexto += `\n\n*…e mais ${advs.length - 5} antiga(s). Veja em 📋 Histórico.*`;
  }

  const embed = new EmbedBuilder()
    .setColor(cor)
    .setTitle(`🔍 ${user.username}${user.bot ? ' 🤖' : ''}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '👤 Usuário', value: `<@${user.id}>`, inline: true },
      { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
      { name: '🏷️ Apelido no servidor', value: member ? member.displayName : '—', inline: true },
      {
        name: '📅 Conta criada',
        value: `<t:${ts(user.createdAt)}:D>\n(${idadeConta(user.createdAt)})`,
        inline: true,
      },
      {
        name: '📥 Entrou no servidor',
        value: member && member.joinedAt ? `<t:${ts(member.joinedAt)}:D>\n(<t:${ts(member.joinedAt)}:R>)` : '❌ Não está no servidor',
        inline: true,
      },
      { name: '⭐ Maior cargo', value: maiorCargo, inline: true },
      { name: `🎭 Cargos (${qtdCargos})`, value: cargosTexto, inline: false },
      { name: `⚠️ Advertências (${advs.length})`, value: advTexto, inline: false }
    )
    .setTimestamp();

  const linha1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`adv_aplicar_${userId}`)
      .setLabel('Aplicar advertência')
      .setEmoji('⚠️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(user.bot),
    new ButtonBuilder()
      .setCustomId(`adv_historico_${userId}`)
      .setLabel('Histórico')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(advs.length === 0),
    new ButtonBuilder()
      .setCustomId(`adv_remover_${userId}`)
      .setLabel('Remover última')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(advs.length === 0)
  );

  const linha2 = new ActionRowBuilder();
  if (dono && advs.length > 0) {
    linha2.addComponents(
      new ButtonBuilder().setCustomId(`adv_limpar_${userId}`).setLabel('Limpar todas').setEmoji('🧹').setStyle(ButtonStyle.Danger)
    );
  }
  linha2.addComponents(
    new ButtonBuilder().setCustomId('painel_pesquisar').setLabel('Nova pesquisa').setEmoji('🔍').setStyle(ButtonStyle.Secondary),
    botaoVoltarPainel()
  );

  return { content: aviso, embeds: [embed], components: [linha1, linha2] };
}

// ---------- HISTÓRICO ----------
async function viewHistorico(guild, userId) {
  const user = await guild.client.users.fetch(userId).catch(() => null);
  const advs = listarAdvertencias(userId);

  const linhas = advs
    .map((a, i) => ({ ...a, n: i + 1 }))
    .reverse()
    .map((a) => `**#${a.n}** — <t:${ts(a.em)}:f>\n> ${truncar(a.motivo, 300).replace(/\n/g, '\n> ')}\nAplicada por <@${a.por}>`);

  let descricao = linhas.join('\n\n') || 'Nenhuma advertência.';
  if (descricao.length > 4000) descricao = truncar(descricao, 3990);

  const embed = new EmbedBuilder()
    .setColor(COR.amarelo)
    .setTitle(`📋 Histórico de advertências — ${user ? user.username : userId}`)
    .setDescription(descricao)
    .setFooter({ text: `${advs.length} advertência(s) no total • da mais recente para a mais antiga` });

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`perfil_${userId}`).setLabel('Voltar ao perfil').setEmoji('⬅️').setStyle(ButtonStyle.Secondary)
  );

  return { content: '', embeds: [embed], components: [botoes] };
}

// ---------- PERMISSÕES (só o dono) ----------
function viewPermissoes(guild) {
  const config = lerConfig();
  const cargos = config.cargos.length ? config.cargos.map((id) => `<@&${id}>`).join(' ') : '*nenhum*';
  const usuarios = config.usuarios.length ? config.usuarios.map((id) => `<@${id}>`).join(' ') : '*nenhum*';

  const embed = new EmbedBuilder()
    .setColor(COR.azul)
    .setTitle('⚙️ Permissões do bot')
    .setDescription(
      `**Dono (acesso total):** <@${donoId(guild)}>\n\n` +
        `**Cargos com acesso:** ${cargos}\n` +
        `**Usuários com acesso:** ${usuarios}\n\n` +
        'Use os menus abaixo pra escolher quem pode abrir o painel e usar `/advertir`. ' +
        'O que você selecionar **substitui** a lista atual (desmarque pra remover alguém).\n' +
        '*Ser Administrador do Discord não dá acesso sozinho: só quem estiver nessa lista (ou for o dono).*'
    );

  const menuCargos = new RoleSelectMenuBuilder()
    .setCustomId('sel_perm_cargos')
    .setPlaceholder('Cargos com acesso ao painel')
    .setMinValues(0)
    .setMaxValues(25);
  if (config.cargos.length) menuCargos.setDefaultRoles(...config.cargos.slice(0, 25));

  const menuUsuarios = new UserSelectMenuBuilder()
    .setCustomId('sel_perm_usuarios')
    .setPlaceholder('Usuários com acesso ao painel')
    .setMinValues(0)
    .setMaxValues(25);
  if (config.usuarios.length) menuUsuarios.setDefaultUsers(...config.usuarios.slice(0, 25));

  return {
    content: '',
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menuCargos),
      new ActionRowBuilder().addComponents(menuUsuarios),
      new ActionRowBuilder().addComponents(botaoVoltarPainel()),
    ],
  };
}

function viewErro(texto) {
  return {
    content: texto,
    embeds: [],
    components: [new ActionRowBuilder().addComponents(botaoVoltarPainel())],
  };
}

// ---------- MODAIS ----------
function modalAdvertencia(userId, nomeUsuario) {
  return new ModalBuilder()
    .setCustomId(`modal_adv_${userId}`)
    .setTitle(truncar(`Advertência: ${nomeUsuario}`, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('motivo')
          .setLabel('Motivo da advertência')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(3)
          .setMaxLength(500)
          .setRequired(true)
      )
    );
}

function modalBuscarId() {
  return new ModalBuilder()
    .setCustomId('modal_buscar_id')
    .setTitle('Buscar usuário por ID')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('id_usuario')
          .setLabel('ID do usuário (ou menção)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 123456789012345678')
          .setRequired(true)
      )
    );
}

module.exports = {
  COR,
  idadeConta,
  viewPainel,
  viewPesquisar,
  viewAdvertir,
  viewPerfil,
  viewHistorico,
  viewPermissoes,
  viewErro,
  modalAdvertencia,
  modalBuscarId,
};
