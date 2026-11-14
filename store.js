const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function ler(nome, padrao) {
  try {
    const conteudo = fs.readFileSync(path.join(DATA_DIR, nome), 'utf-8');
    return conteudo.trim() ? JSON.parse(conteudo) : padrao;
  } catch {
    return padrao;
  }
}

function salvar(nome, dados) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, nome), JSON.stringify(dados, null, 2), 'utf-8');
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ---------- ADVERTÊNCIAS ----------
function listarAdvertencias(userId) {
  return ler('advertencias.json', {})[userId] || [];
}

function adicionarAdvertencia(userId, motivo, porId) {
  const todas = ler('advertencias.json', {});
  const lista = todas[userId] || [];
  const adv = { id: gerarId(), motivo, por: porId, em: new Date().toISOString() };
  lista.push(adv);
  todas[userId] = lista;
  salvar('advertencias.json', todas);
  return adv;
}

function removerUltimaAdvertencia(userId) {
  const todas = ler('advertencias.json', {});
  const lista = todas[userId] || [];
  const removida = lista.pop() || null;
  if (lista.length === 0) delete todas[userId];
  else todas[userId] = lista;
  salvar('advertencias.json', todas);
  return removida;
}

function limparAdvertencias(userId) {
  const todas = ler('advertencias.json', {});
  const quantidade = (todas[userId] || []).length;
  delete todas[userId];
  salvar('advertencias.json', todas);
  return quantidade;
}

// ---------- CONFIGURAÇÃO DE ACESSO ----------
function lerConfig() {
  const c = ler('config.json', {});
  return { cargos: c.cargos || [], usuarios: c.usuarios || [] };
}

function salvarConfig(config) {
  salvar('config.json', { cargos: config.cargos || [], usuarios: config.usuarios || [] });
}

module.exports = {
  listarAdvertencias,
  adicionarAdvertencia,
  removerUltimaAdvertencia,
  limparAdvertencias,
  lerConfig,
  salvarConfig,
};
