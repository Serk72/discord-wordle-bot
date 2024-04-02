const {Client, GatewayIntentBits, Events, Routes, REST} = require('discord.js');
const {WordleBotClient} = require('./src/WordleBotClient');
const {SummaryCommand} = require('./src/commands');
const {WordleGame} = require('./src/data/WordleGame');

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent]});
const config = require('config');
const commands = require('./src/commands');
const WORDLE_CHANNEL_ID = config.get('autoPostSummaryChannel');
const runAtSpecificTimeOfDay = (hour, minutes, func) => {
  const twentyFourHours = 86400000;
  const now = new Date();
  let etaMS = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minutes, 0, 0).getTime() - now;
  if (etaMS < 0) {
    etaMS += twentyFourHours;
  }
  setTimeout(() => {
    // run once
    func();
    // run every 24 hours from now on
    setInterval(func, twentyFourHours);
  }, etaMS);
};

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


runAtSpecificTimeOfDay(22, 0, async () => {
  const wordleChannel = client.channels.cache.get(WORDLE_CHANNEL_ID);
  if (!(await WordleGame.getInstance().getLatestGameSummaryPosted())) {
    await SummaryCommand.getInstance().execute(null, wordleChannel);
    await WordleGame.getInstance().summaryPosted(await WordleGame.getInstance().getLatestGame());
  }
});
