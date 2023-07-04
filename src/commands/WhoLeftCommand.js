const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {WordleGame} = require('../data/WordleGame');
const {Score} = require('../data/Score');
const config = require('config');

const INSULT_USERNAME = config.get('insultUserName');
const FOOTER_MESSAGE = config.get('footerMessage');
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
    this.data = WhoLeftCommand.data;
  }

  /**
   * Determines what players have not completed the days wordle and senda a message
   * indicated players that have not finished yet to the WORDLE_CHANNEL_ID channel.
   * @param {*} interaction discord interaction if specified the command will reply too.
   * @param {*} discordWordleChannel discord channel to send the command output too, only used if not an interaction.
   */
  async execute(interaction, discordWordleChannel) {
    const latestGame = await this.wordleGame.getLatestGame();
    const totalPlayes = await this.wordleScore.getTotalPlayers();
    const gamePlayers = await this.wordleScore.getPlayersForGame(latestGame);
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
      totalPlayes.filter((player) => !gamePlayers.includes(player)).forEach((player) => {
        if (player === INSULT_USERNAME) {
          const insultMessages = [
            `Is too lazy to complete Wordle ${latestGame}`,
            `Is holding everone else back on Wordle ${latestGame}, he's the worst`,
            `Is the worst. Complete Wordle ${latestGame} already!`,
            `Has time to edit discord names but not complete Wordle ${latestGame}`,
            `As per usual has not completed Wordle ${latestGame}`,
          ];
          const randomIndex = Math.floor(Math.random() * 5);

          embed.addFields({name: `${player}`, value: insultMessages[randomIndex]});
        } else {
          embed.addFields({name: `${player}`, value: `Has not completed Wordle ${latestGame}`});
        }
      });
      if (FOOTER_MESSAGE) {
        embed.setFooter({text: FOOTER_MESSAGE} );
      }
    }
    if (interaction) {
      interaction.reply({embeds: [embed]});
    } else {
      await discordWordleChannel.send({embeds: [embed]});
    }
  }
}

module.exports = WhoLeftCommand;
