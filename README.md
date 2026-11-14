# 🛡️ Bot de Moderação — Country RP

Painel privado de moderação: pesquisa de usuário, advertências, e controle de quem pode usar.

## O que ele faz

| Comando | Quem usa | O que faz |
|---|---|---|
| `/painel` | Dono + liberados | Abre o painel (só quem usou vê) |
| `/advertir` | Dono + liberados | Aplica uma advertência direto, sem abrir o painel |

**Dentro do `/painel`:**
- 🔍 **Pesquisar usuário** — escolhe o membro (ou busca por ID, se ele já saiu) e mostra: conta criada + idade da conta, quando entrou no servidor, apelido, maior cargo, todos os cargos e as advertências.
- ⚠️ **Aplicar advertência** — escolhe o membro, escreve o motivo numa janela, pronto. A pessoa recebe um aviso por DM (se tiver DM aberta).
- No perfil do usuário: **Histórico** completo, **Remover última** advertência e (só o dono) **Limpar todas**.
- ⚙️ **Permissões** (só o dono vê esse botão) — escolhe nos menus quais **cargos** e quais **pessoas** podem usar o bot.

## Quem pode usar

- **Dono** = a conta que está em `OWNER_ID`. Acesso total e é o único que mexe nas permissões.
- **Liberados** = cargos e pessoas que o dono escolher em ⚙️ Permissões.
- Ser "Administrador" do Discord **não** dá acesso sozinho. Só dono + lista do dono.
- Não dá pra advertir: bots, você mesmo, nem o dono.

Se o dono tirar o acesso de alguém, os botões antigos dele param de funcionar na hora.

## Passo a passo pra colocar no ar

### 1. Criar o bot no Discord
1. Vá em https://discord.com/developers/applications → **New Application** → nome "Country RP" (ou use outro, se preferir).
2. Menu **Bot** → **Reset Token** → copie (vai no `DISCORD_TOKEN`).
3. Menu **General Information** → copie o **Application ID** (vai no `CLIENT_ID`).
4. Menu **OAuth2 → URL Generator**: marque `bot` e `applications.commands`. Em permissões do bot, marque só **Send Messages** e **Embed Links**. Abra o link gerado e adicione o bot no servidor.

Não precisa ligar nenhum "Privileged Intent".

### 2. Pegar os IDs
No Discord: Configurações → Avançado → ative o **Modo Desenvolvedor**. Aí, botão direito em:
- o ícone do servidor → **Copiar ID** (vai no `GUILD_ID`)
- você mesmo → **Copiar ID** (vai no `OWNER_ID`)
- (opcional) um canal de logs → **Copiar ID** (vai no `LOG_CHANNEL_ID`)

### 3. Configurar
Renomeie `configurar-env.txt` para `.env` e preencha (sem espaço depois do `=`, sem aspas).

### 4. Rodar
No terminal, dentro da pasta (a que tem o `package.json`):
```
npm install
npm run deploy    (registra os comandos; só precisa rodar de novo se mudar algum comando)
npm start
```

### 5. Usar
No servidor digite `/painel`. Pra liberar outras pessoas: `/painel` → ⚙️ Permissões.

## ⚠️ Importante sobre os dados

As advertências ficam no arquivo `data/advertencias.json` e a lista de acesso em `data/config.json`.
Em hospedagens que apagam os arquivos quando o bot reinicia ou é atualizado, **esses dados somem**. Se for hospedar assim, faça backup desses dois arquivos de vez em quando — ou peça pra migrar para um banco de dados.
Se rodar duas cópias do bot ao mesmo tempo (ex.: no PC e na hospedagem), as respostas dão conflito. Deixe só uma ligada.
