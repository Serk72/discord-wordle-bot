const config = require('config');
const {EmbedBuilder, bold, italic, underscore} = require('discord.js');
const {WordleGame} = require('./data/WordleGame');
const {Score} = require('./data/Score');

const INSULT_USERNAME = config.get('insultUserName');
const WORDLE_CHANNEL_ID = config.get('wordleMonitorChannelID');
const FOOTER_MESSAGE = config.get('footerMessage');
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
    this.wordleGame = new WordleGame();
    this.wordleScore = new Score();
    this.discordWordleChannel = channel;
  }
  /**
   * Determines what players have not completed the days wordle and senda a message
   * indicated players that have not finished yet to the WORDLE_CHANNEL_ID channel.
   */
  async _whoIsLeft() {
    const latestGame = await this.wordleGame.getLatestGame();
    const totalPlayes = await this.wordleScore.getTotalPlayers();
    const gamePlayers = await this.wordleScore.getPlayersForGame(latestGame);
    let embed;
    if (totalPlayes.length === gamePlayers.length) {
      embed = new EmbedBuilder()
          .setTitle(`Everyone is done with ${latestGame}`)
          .setColor('#4169e1'); // set the color of the em
      embed.setDescription(`All done.`);
      if (FOOTER_MESSAGE) {
        embed.setFooter({text: FOOTER_MESSAGE} );
      }
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
          const caseyMessages = [
            `Is too lazy to complete Wordle ${latestGame}`,
            `Is holding everone else back on Wordle ${latestGame}, he's the worst`,
            `Is the worst. Complete Wordle ${latestGame} already!`,
            `Has time to edit discord names but not complete Wordle ${latestGame}`,
            `As per usual has not completed Wordle ${latestGame}`,
          ];
          const randomIndex = Math.floor(Math.random() * 5);

          embed.addFields({name: `${player}`, value: caseyMessages[randomIndex]});
        } else {
          embed.addFields({name: `${player}`, value: `Has not completed Wordle ${latestGame}`});
        }
      });
      if (FOOTER_MESSAGE) {
        embed.setFooter({text: FOOTER_MESSAGE} );
      }
    }


    await this.discordWordleChannel.send({embeds: [embed]});
  }
  /**
   * Calculates and sends the monthly summary for all plays for last month.
   */
  async _sendSQLMonthly() {
    const lastMonthSummary = await this.wordleScore.getLastMonthSummaries();

    const embed = new EmbedBuilder()
        .setTitle(`Wordle ${lastMonthSummary?.[0]?.lastmonth} Summary`)
        .setColor('#4169e1'); // set the color of the em
    lastMonthSummary.forEach((row) => {
      const totalGames = row.games;
      embed.addFields({name: `${underscore(italic(bold(row.username)))}`,
        value: `${bold('Games Played')}: ${totalGames}
      ${bold('Games Lost')}: ${row.gameslost}
      ${bold('Average Score')}: ${row.average}
      `});
    });
    embed.setDescription(`Wordle ${lastMonthSummary?.[0]?.lastmonth} Scores`);
    if (FOOTER_MESSAGE) {
      embed.setFooter({text: FOOTER_MESSAGE} );
    }
    await this.discordWordleChannel.send({embeds: [embed]});
  }
  /**
   * Calculates and sends the overall average summaries for all players in the game.
   */
  async _sendSQLSummary() {
    const overallSummary = await this.wordleScore.getPlayerSummaries();
    const day7Summary = await this.wordleScore.getLast7DaysSummaries();
    const lastMonthSummary = await this.wordleScore.getLastMonthSummaries();
    const sum7dayByUser = day7Summary.reduce((acc, sum) => {
      acc[sum.username] = sum;
      return acc;
    }, {});
    let score = 0;
    let gamesPlayed = 0;
    overallSummary.forEach((row) => {
      score += +row.totalscore;
      gamesPlayed += +row.games;
    });
    const bayesianC = +(overallSummary[overallSummary.length-2].games);
    const overallAverage = score / gamesPlayed;
    const embed = new EmbedBuilder()
        .setTitle('Wordle Summary')
        .setColor('#4169e1'); // set the color of the em
    overallSummary.forEach((row) => {
      const day7Sum = {
        average: '',
        games: '',
        lost: '',
      };
      if (sum7dayByUser[row.username]) {
        day7Sum.games = sum7dayByUser[row.username].games;
        day7Sum.average = sum7dayByUser[row.username].average;
        day7Sum.lost = sum7dayByUser[row.username].gameslost;
      }
      const totalGames = +row.games;
      embed.addFields({name: `${underscore(italic(bold(row.username)))}`,
        value: `${bold('Games Played')}: ${totalGames}
      ${bold('Games Lost')}: ${row.gameslost}
      ${bold('Average Score')}: ${row.average}
      ${bold('Bayesian Score')}: ${((+row.totalscore + (bayesianC * overallAverage))/(totalGames + bayesianC)).toFixed(2)}
      ${bold('7 day Games Played')}: ${day7Sum.games}
      ${bold('7 day Games Lost')}: ${day7Sum.lost}
      ${bold('7 day Average Score')}: ${day7Sum.average}
      `});
    });
    embed.setDescription(`Wordle current scores.`);
    embed.addFields({name: `${underscore(italic(bold('Overall Leaders')))}`,
      value: `${bold('Overall Leader')}: ${overallSummary[0].username}
  ${bold('7 day Leader')}: ${day7Summary[0].username}
  ${bold(`${lastMonthSummary?.[0]?.lastmonth?.trim()}`)}: ${lastMonthSummary?.[0].username}
  `});
    embed.setFooter({text: `${FOOTER_MESSAGE ? `${FOOTER_MESSAGE},`: ''} Baysian m=${overallAverage} C=${bayesianC}`} );
    await this.discordWordleChannel.send({embeds: [embed]});
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
      await this._sendSQLSummary();
    } else if (remaining.length === 1) {
      if (remaining[0] === INSULT_USERNAME) {
        await this._whoIsLeft();
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
    if (message.content.startsWith('!whoLeft') || message.content.startsWith('/whoLeft')) {
      message.delete();
      await this._whoIsLeft();
      return;
    }
    if (message.content.startsWith('!summary') || message.content.startsWith('/summary')) {
      message.delete();
      await this._sendSQLSummary();
      return;
    }
    if (message.content.startsWith('!monthly') || message.content.startsWith('/monthly')) {
      message.delete();
      await this._sendSQLMonthly();
      return;
    }
    if (message.channelId === WORDLE_CHANNEL_ID) {
      const found = message?.content?.match(WORDLE_REGEX);
      if (found && found.length) {
        await this._addWorldScore(message);
      }
    }
  }
}

module.exports = {WordleBotClient};
