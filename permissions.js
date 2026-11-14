const { lerConfig } = require('./store');

// Dono = OWNER_ID do .env. Se não estiver configurado, usa o dono do servidor.
function donoId(guild) {
  return process.env.OWNER_ID || guild.ownerId;
}

function ehDono(guild, userId) {
  return userId === donoId(guild);
}

function idsDosCargos(member) {
  if (Array.isArray(member.roles)) return member.roles;
  return [...member.roles.cache.keys()];
}

// Tem acesso = dono, ou usuário liberado, ou algum cargo liberado.
// Ser "Administrador" do Discord NÃO dá acesso automático: quem manda é a lista do dono.
function temAcesso(guild, member) {
  if (ehDono(guild, member.id ?? member.user.id)) return true;
  const config = lerConfig();
  const userId = member.id ?? member.user.id;
  if (config.usuarios.includes(userId)) return true;
  return idsDosCargos(member).some((id) => config.cargos.includes(id));
}

module.exports = { donoId, ehDono, temAcesso };
