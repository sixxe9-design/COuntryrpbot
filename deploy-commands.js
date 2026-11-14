require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const comandos = [];
const pasta = path.join(__dirname, 'commands');
for (const arquivo of fs.readdirSync(pasta).filter((f) => f.endsWith('.js'))) {
  const comando = require(path.join(pasta, arquivo));
  comandos.push(comando.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registrando ${comandos.length} comandos...`);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: comandos });
    console.log('✅ Comandos registrados com sucesso!');
  } catch (erro) {
    console.error(erro);
  }
})();
