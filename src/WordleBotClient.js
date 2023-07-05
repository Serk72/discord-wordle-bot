const config = require('config');
const dayjs = require('dayjs');
const fetch = require('node-fetch');
const {WordleGame} = require('./data/WordleGame');
const {Score} = require('./data/Score');
const {MonthlyCommand, SummaryCommand, WhoLeftCommand} = require('./commands');


const INSULT_USERNAME = config.get('insultUserName');
const WORDLE_CHANNEL_ID = config.get('wordleMonitorChannelID');
const WORDLE_REGEX = /Wordle [0-9]* [0-6Xx]\/[0-6]\*?/g;
/**
 * Main Bot Class to handle events
 */
class WordleBotClient {
  /**
   * Constructor
   * @param {Channel} channel discord channel to send messages too.
   */
  constructor(channel) {
    this.wordleGame = WordleGame.getInstance();
    this.wordleScore = Score.getInstance();
    this.discordWordleChannel = channel;
    this.monthlyCommand = MonthlyCommand.getInstance();
    this.summaryCommand = SummaryCommand.getInstance();
    this.whoLeftCommand = WhoLeftCommand.getInstance();
  }

  /**
   * Adds a new Score to the database. Scores already added will be ignored.
   * @param {*} message discord message containing a wordle score.
   */
  async _addWorldScore(message) {
    const found = message?.content?.match(WORDLE_REGEX);
    const wordle = found[0];
    const subWordle = wordle.substring(wordle.indexOf(' ')+1);
    const wordleNumber = Number(subWordle.substring(0, subWordle.indexOf(' ')));

    if (!(await this.wordleGame.getWordleGame(wordleNumber))) {
      await this.wordleGame.createWordleGame(wordleNumber, message.createdTimestamp);
    }

    if (!(await this.wordleScore.getScore(message.author.username, wordleNumber))) {
      await this.wordleScore.createScore(message.author.username, message.author.tag, wordle, wordleNumber, message.createdTimestamp);
    }

    const latestGame = await this.wordleGame.getLatestGame();
    const totalPlayes = await this.wordleScore.getTotalPlayers();
    const gamePlayers = await this.wordleScore.getPlayersForGame(latestGame);
    const remaining = totalPlayes.filter((player) => !gamePlayers.includes(player));
    console.log(remaining);
    if (!remaining.length) {
      await this.summaryCommand.execute(null, this.discordWordleChannel);
    } else if (remaining.length === 1) {
      if (remaining[0] === INSULT_USERNAME) {
        await this.whoLeftCommand.execute(null, this.discordWordleChannel);
      }
    }

    const currentGame = await this.wordleGame.getWordleGame(latestGame);
    if (!currentGame?.word || currentGame.word.trim() === '') {
      const day = dayjs().format('YYYY-MM-DD');
      const url = `https://www.nytimes.com/svc/wordle/v2/${day}.json`;
      const solution = await fetch(url, {method: 'Get'})
          .then((res) => res?.json())
          .catch((ex) => {
            console.error(ex);
            return null;
          });
      if (solution) {
        await this.wordleGame.addWord(solution.days_since_launch, solution.solution);
      }
    }
  }
  /**
   * Discord Edit Event Handler
   * @param {*} oldMessage The discord message before the edit.
   * @param {*} newMessage The discord message after the edit.
   */
  async editEvent(oldMessage, newMessage) {
    console.log('edit Event.');
    console.log(oldMessage?.content);
    console.log(newMessage?.content);
    const found = newMessage?.content?.match(WORDLE_REGEX);
    if (found && found.length) {
      const wordle = found[0];
      const subWordle = wordle.substring(wordle.indexOf(' ')+1);
      const wordleNumber = Number(subWordle.substring(0, subWordle.indexOf(' ')));
      if ((await this.wordleScore.getScore(newMessage.author.username, wordleNumber))) {
        await newMessage.lineReply('I saw that, Edited Wordle Score Ignored.');
      } else {
        await this._addWorldScore(newMessage);
        await newMessage.lineReply('I got you, Edited Wordle Score Counted.');
      }
    }
  }
  /**
   * Discord Message Handler
   * @param {*} message new message to process.
   * @return {*}
   */
  async messageHandler(message) {
    if (message.channelId !== WORDLE_CHANNEL_ID) {
      return;
    }
    if (message.content.startsWith(`!${this.whoLeftCommand.data.name}`) || message.content.startsWith(`/${this.whoLeftCommand.data.name}`)) {
      message.delete();
      await this.whoLeftCommand.execute(null, this.discordWordleChannel);
      return;
    }
    if (message.content.startsWith(`!${this.summaryCommand.data.name}`) || message.content.startsWith(`/${this.summaryCommand.data.name}`)) {
      message.delete();
      await this.summaryCommand.execute(null, this.discordWordleChannel);
      return;
    }
    if (message.content.startsWith(`!${this.monthlyCommand.data.name}`) || message.content.startsWith(`/${this.monthlyCommand.data.name}`)) {
      message.delete();
      await this.monthlyCommand.execute(null, this.discordWordleChannel);
      return;
    }
    const found = message?.content?.match(WORDLE_REGEX);
    if (found && found.length) {
      await this._addWorldScore(message);
    }
  }
}

module.exports = {WordleBotClient};
