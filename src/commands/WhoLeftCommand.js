const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {WordleGame} = require('../data/WordleGame');
const {AIMessages} = require('../data/AIMessages');
const {Agent, fetch} = require('undici');

const {Score} = require('../data/Score');
const config = require('config');

const INSULT_USERNAME = config.get('insultUserName');
const INSULT_USER_ID = config.get('insultUserId');
const FOOTER_MESSAGE = config.get('footerMessage');
const OLLAMA_CONFIG = config.get('ollama');

/**
 * Command for determining what players have not completed the days wordle and senda a message
 * indicated players that have not finished yet to the WORDLE_CHANNEL_ID channel.
 */
class WhoLeftCommand {
  static _instance;
  /**
   * Singleton instance.
   * @return {WhoLeftCommand} the singleton instance
   */
  static getInstance() {
    if (!WhoLeftCommand._instance) {
      WhoLeftCommand._instance = new WhoLeftCommand();
    }
    return WhoLeftCommand._instance;
  }
  static data = new SlashCommandBuilder()
      .setName('wholeft')
      .setDescription('Posts who has not completed the current Wordle for the day.');
  /**
   * Constructor.
   */
  constructor() {
    this.wordleGame = WordleGame.getInstance();
    this.wordleScore = Score.getInstance();
    this.aiMessages = AIMessages.getInstance();
    this.data = WhoLeftCommand.data;
  }

  /**
   * Determines what players have not completed the days wordle and senda a message
   * indicated players that have not finished yet to the WORDLE_CHANNEL_ID channel.
   * @param {*} interaction discord interaction if specified the command will reply too.
   * @param {*} discordWordleChannel discord channel to send the command output too, only used if not an interaction.
   */
  async execute(interaction, discordWordleChannel) {
    let guildId;
    let channelId;
    if (interaction) {
      guildId = interaction.guildId;
      channelId = interaction.channelId;
    } else if (discordWordleChannel) {
      guildId = discordWordleChannel.guildId;
      channelId = discordWordleChannel.id;
    } else {
      console.error('invalid WhoLeft command call. no interaction or channel');
      throw new Error('Invalid WhoLeft call');
    }
    if (interaction) {
      await interaction.deferReply({ephemeral: true});
      await interaction.followUp({content: 'Processing...', ephemeral: true});
    }
    const latestGame = await this.wordleGame.getLatestGame();
    const totalPlayes = await this.wordleScore.getTotalPlayers(guildId, channelId);
    const gamePlayers = await this.wordleScore.getPlayersForGame(latestGame, guildId, channelId);
    let embed;
    if (totalPlayes.length === gamePlayers.length) {
      embed = new EmbedBuilder()
          .setTitle(`Everyone is done with ${latestGame}`)
          .setColor('#4169e1'); // set the color of the em
      embed.setDescription(`All done.`);
    } else {
      if (totalPlayes.length - gamePlayers.length === 1) {
        const remaining = totalPlayes.filter((player) => !gamePlayers.includes(player));
        if (remaining[0] === INSULT_USERNAME) {
          embed = new EmbedBuilder()
              .setTitle(`Once again ${INSULT_USERNAME} is the last one remaining...`)
              .setColor('#4169e1');
        } else {
          embed = new EmbedBuilder()
              .setTitle('One player Remaining')
              .setColor('#4169e1');
        }
      } else {
        embed = new EmbedBuilder()
            .setTitle('People not done')
            .setColor('#4169e1'); // set the color of the em
      }
      const insultMessage = await this.getAIMessage(latestGame);
      totalPlayes.filter((player) => !gamePlayers.includes(player)).forEach((player) => {
        if (player === INSULT_USERNAME) {
          embed.addFields({name: `${player}`, value: insultMessage});
        } else {
          embed.addFields({name: `${player}`, value: `Has not completed Wordle ${latestGame}`});
        }
      });
      if (FOOTER_MESSAGE) {
        embed.setFooter({text: FOOTER_MESSAGE} );
      }
    }
    if (interaction) {
      interaction.followUp({embeds: [embed]});
    } else {
      await discordWordleChannel.send({embeds: [embed]});
    }
  }

  /**
   * Attempts to get an AI generated message for the insult player.
   * @param {*} latestGame game number generated for.
   * @return {string} An AI generated message or random hardcoded message if getting the AI message from ollama fails.
   */
  async getAIMessage(latestGame) {
    let response;
    let messages;
    if (OLLAMA_CONFIG.generateMessages) {
      messages = (await this.aiMessages.getMessageList('wordleInsults')) || [];
      messages.push({
        role: 'user',
        content: `Generate an insult for Wordle Game ${latestGame}`,
      });
      const url = `${OLLAMA_CONFIG.host}:${OLLAMA_CONFIG.port}/api/chat`;
      response = await fetch(url,
          {
            method: 'POST',
            dispatcher: new Agent(
                {
                  connectTimeout: 86400000,
                  bodyTimeout: 86400000,
                  headersTimeout: 86400000,
                  keepAliveMaxTimeout: 86400000,
                  keepAliveTimeout: 86400000,
                }),
            body: JSON.stringify(
                {
                  model: OLLAMA_CONFIG.insultModelName,
                  stream: false,
                  messages: messages,
                }),
          })
          .then((res) => res.json())
          .then((res) => {
            console.log(`Response took ${res?.total_duration/60000000000} min`);
            return res;
          })
          .catch((ex) => {
            console.error(ex);
            return null;
          });
      messages.push(response?.message);
    }
    if (response?.message?.content) {
      await this.aiMessages.updateMessageList('wordleInsults', messages);
      return response.message.content.replaceAll('[Name]', `${INSULT_USER_ID}`).replaceAll('[Player]', `${INSULT_USER_ID}`);
    } else {
      console.error('Unable to generate insult.');
      const insultMessages = [
        `Is too lazy to complete Wordle ${latestGame}`,
        `Is holding everone else back on Wordle ${latestGame}, he's the worst`,
        `Is the worst. Complete Wordle ${latestGame} already!`,
        `Has time to edit discord names but not complete Wordle ${latestGame}`,
        `As per usual has not completed Wordle ${latestGame}`,
      ];
      const randomIndex = Math.floor(Math.random() * 5);

      return insultMessages[randomIndex];
    }
  }
}

module.exports = WhoLeftCommand;
