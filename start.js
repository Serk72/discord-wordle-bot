const {Client, GatewayIntentBits, Events, Routes, REST} = require('discord.js');
const {WordleBotClient} = require('./src/WordleBotClient');

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent]});
const config = require('config');
const commands = require('./src/commands');

const rest = new REST({version: '10'}).setToken(config.get('discordBotToken'));
client.on(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.guilds.cache.forEach((guild) => {
    rest.put(Routes.applicationGuildCommands(config.get('applicationId'), guild.id), {
      body: Object.keys(commands).map((command) => commands[command].data.toJSON()),
    });
  });
  console.log(`Connected to ${client.guilds.cache.size} guilds`);
  const botClient = new WordleBotClient();

  client.on(Events.MessageUpdate, botClient.editEvent.bind(botClient));
  client.on(Events.MessageCreate, botClient.messageHandler.bind(botClient));
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const exeCommand = Object.keys(commands).map((command) => commands[command].getInstance()).find((command) => command.data.name === interaction.commandName);
    if (!exeCommand) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
    try {
      await exeCommand.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({content: `There was an error while executing this command: ${error.message}`, ephemeral: true});
      } else {
        await interaction.reply({content: `There was an error while executing this command: ${error.message}`, ephemeral: true});
      }
    }
  });
});

client.login(config.get('discordBotToken'));
