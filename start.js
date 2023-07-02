const {Client, GatewayIntentBits, Events} = require('discord.js');
const {WordleBotClient} = require('./src/WordleBotClient');
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent]});
const config = require('config');

const WORDLE_CHANNEL_ID = config.get('wordleMonitorChannelID');


client.on(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Connected to ${client.guilds.cache.size} guilds`);
  const botClient = new WordleBotClient(client.channels.cache.get(WORDLE_CHANNEL_ID));
  client.on(Events.MessageUpdate, botClient.editEvent.bind(botClient));
  client.on(Events.MessageCreate, botClient.messageHandler.bind(botClient));
});

client.login(config.get('discordBotToken'));
