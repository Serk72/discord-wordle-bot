const config = require('config');
const {WordleGame} = require('./data/WordleGame');
const {Score} = require('./data/Score');


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
   * @param {MonthlyCommand} monthlyCommand command for monthly summaries
   * @param {SummaryCommand} summaryCommand command for daily summaries
   * @param {WhoLeftCommand} whoLeftCommand command for who left messages.
   */
  constructor(channel, monthlyCommand, summaryCommand, whoLeftCommand) {
    this.wordleGame = WordleGame.getInstance();
    this.wordleScore = Score.getInstance();
    this.discordWordleChannel = channel;
    this.monthlyCommand = monthlyCommand;
    this.summaryCommand = summaryCommand;
    this.whoLeftCommand = whoLeftCommand;
  }

  /**
   * Reads all messages in the discordWordleChannel to find and store all Wordle scores.
   * This method should only be run once when first loading the bot to get all historical scores.
   */
  async _readAllMessages() {
    let tempMessages = await this.discordWordleChannel.messages.fetch({limit: 50});
    const messages = [];
    while (tempMessages.size > 0) {
      tempMessages.forEach((msg) => messages.push(msg));
      tempMessages = await this.discordWordleChannel.messages.fetch({before: tempMessages.last().id});
    }
    await Promise.all(messages?.map(async (message) => {
      const found = message?.content?.match(WORDLE_REGEX);
      if (found && found.length) {
        const wordle = found[0];
        const subWordle = wordle.substring(wordle.indexOf(' ')+1);
        const wordleNumber = Number(subWordle.substring(0, subWordle.indexOf(' ')));

        if (!(await this.wordleGame.getWordleGame(wordleNumber))) {
          await this.wordleGame.createWordleGame(wordleNumber, message.createdTimestamp);
        }

        if (!(await this.wordleScore.getScore(message.author.username, wordleNumber))) {
          await this.wordleScore.createScore(message.author.username, message.author.tag, wordle, wordleNumber, message.createdTimestamp);
        }
      }
    }));
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
      await this.summaryCommand.execute();
    } else if (remaining.length === 1) {
      if (remaining[0] === INSULT_USERNAME) {
        await this.whoLeftCommand.execute();
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
    if (message.content.startsWith('!wholeft') || message.content.startsWith('/wholeft')) {
      message.delete();
      await this.whoLeftCommand.execute();
      return;
    }
    if (message.content.startsWith('!summary') || message.content.startsWith('/summary')) {
      message.delete();
      await this.summaryCommand.execute();
      return;
    }
    if (message.content.startsWith('!monthly') || message.content.startsWith('/monthly')) {
      message.delete();
      await this.monthlyCommand.execute();
      return;
    }
    const found = message?.content?.match(WORDLE_REGEX);
    if (found && found.length) {
      await this._addWorldScore(message);
    }
  }
}

module.exports = {WordleBotClient};
