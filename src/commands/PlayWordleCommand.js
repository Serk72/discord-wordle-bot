const {SlashCommandBuilder} = require('discord.js');
const {WordleGame} = require('../data/WordleGame');
const {WordlePlayer} = require('../WordlePlayer');

/**
 * Command for playing a wordle game.
 */
class PlayWordleCommand {
  static _instance;
  /**
   * Singleton instance.
   * @return {PlayWordleCommand} the singleton instance
   */
  static getInstance() {
    if (!PlayWordleCommand._instance) {
      PlayWordleCommand._instance = new PlayWordleCommand();
    }
    return PlayWordleCommand._instance;
  }
  static data = new SlashCommandBuilder()
      .setName('play_wordle')
      .addIntegerOption((option) =>
        option.setName('wordle_game')
            .setDescription('The Wordle Game Number to play')
            .setMinValue(0))
      .setDescription('Makes the bot play the given wordle game or latest.');
  /**
   * Constructor.
   */
  constructor() {
    this.wordleGame = WordleGame.getInstance();
    this.wordlePlayer = new WordlePlayer();
    this.data = PlayWordleCommand.data;
  }

  /**
   * Plays a wordle game and posts the score.
   * @param {*} interaction discord interaction if specified the command will reply too.
   * @param {*} discordWordleChannel discord channel to send the command output too, only used if not an interaction.
   */
  async execute(interaction, discordWordleChannel) {
    let gameNumber = interaction.options.getInteger('wordle_game');
    if (!gameNumber) {
      gameNumber = await this.wordleGame.getLatestGame();
    }

    let messageToSend = await this.wordlePlayer.playGame(gameNumber);

    if (!messageToSend) {
      messageToSend = `Unable to play Wordle Game: ${gameNumber}`;
    }
    if (interaction) {
      await interaction.reply(messageToSend);
    } else {
      await discordWordleChannel.send(messageToSend);
    }
  }
}

module.exports = PlayWordleCommand;
