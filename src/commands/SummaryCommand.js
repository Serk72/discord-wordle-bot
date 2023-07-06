const {SlashCommandBuilder} = require('discord.js');
const {Score} = require('../data/Score');
const fetch = require('node-fetch');
const {WordleGame} = require('../data/WordleGame');
const AsciiTable = require('ascii-table');
const config = require('config');

const FOOTER_MESSAGE = config.get('footerMessage');
const USER_TO_NAME_MAP = config.get('userToNameMap');

/**
 * Command for dispalying summary table for wordle averages.
 */
class SummaryCommand {
  static _instance;
  /**
   * Singleton instance.
   * @return {SummaryCommand} the singleton instance
   */
  static getInstance() {
    if (!SummaryCommand._instance) {
      SummaryCommand._instance = new SummaryCommand();
    }
    return SummaryCommand._instance;
  }
  static data = new SlashCommandBuilder()
      .setName('summary')
      .setDescription('Displays the current summary (message displated each day)');
    /**
     * Constructor.
     */
  constructor() {
    this.wordleScore = Score.getInstance();
    this.wordleGame = WordleGame.getInstance();
    this.data = SummaryCommand.data;
  }

  /**
     * Calculates and sends the overall average summaries for all players in the game.
     * @param {*} interaction discord interaction if specified the command will reply too.
     * @param {*} discordWordleChannel discord channel to send the command output too, only used if not an interaction.
     */
  async execute(interaction, discordWordleChannel) {
    const overallSummary = await this.wordleScore.getPlayerSummaries();
    const day7Summary = await this.wordleScore.getLast7DaysSummaries();
    const lastMonthSummary = await this.wordleScore.getLastMonthSummaries();
    const latestGameNumber = await this.wordleGame.getLatestGame();
    const latestGame = await this.wordleGame.getWordleGame(latestGameNumber);
    const latestScores = await this.wordleScore.getGameScores(latestGameNumber);
    const sum7dayByUser = day7Summary.reduce((acc, sum) => {
      acc[sum.username] = sum;
      return acc;
    }, {});
    const summaryTable = new AsciiTable('Wordle Summary');
    summaryTable.setHeading('User', 'GP', 'AS', '7DA');
    overallSummary.forEach((row) => {
      const totalGames = +row.games;
      const day7Summary = {
        gamesPlayed: '',
        average: '',
        gamesLost: '',
      };
      if (sum7dayByUser[row.username]) {
        day7Summary.gamesPlayed = sum7dayByUser[row.username].games;
        day7Summary.average = sum7dayByUser[row.username].average;
        day7Summary.gamesLost = sum7dayByUser[row.username].gameslost;
      }
      summaryTable.addRow(
          USER_TO_NAME_MAP[row.username] || row.username,
          totalGames,
          row.average,
          day7Summary.average);
    });

    let messageToSend = `\`\`\`
${summaryTable.toString()}\`\`\`
    ***Overall Leader: ${USER_TO_NAME_MAP[overallSummary[0].username] || overallSummary[0].username}***
    **7 Day Leader: ${USER_TO_NAME_MAP[day7Summary[0].username] || day7Summary[0].username}**
    **${lastMonthSummary?.[0]?.lastmonth?.trim()} Winner: ${USER_TO_NAME_MAP[lastMonthSummary?.[0]?.username] || lastMonthSummary?.[0]?.username}**
    **Today's Winner: ${USER_TO_NAME_MAP[latestScores?.[0]?.username] || latestScores?.[0]?.username}**
    ${FOOTER_MESSAGE ? `*${FOOTER_MESSAGE}*`: ''}`;
    if (latestGame?.word && latestGame?.word?.trim() !== '') {
      const giphyApiKey = config.get('giphyApiKey');
      if (giphyApiKey) {
        const url = `http://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${latestGame?.word}&limit=1`;
        const response = await fetch(url, {method: 'Get'})
            .then((res) => res?.json())
            .catch((ex) => {
              console.error(ex);
              return null;
            });

        if (response?.data?.[0]?.url) {
          messageToSend = `${messageToSend}\n${response?.data?.[0]?.url}`;
        } else {
          console.error('Giphy Invalid Response.');
          console.error(response);
        }
      }
    }
    if (interaction) {
      interaction.reply(messageToSend);
    } else {
      await discordWordleChannel.send(messageToSend);
    }
  }
}

module.exports = SummaryCommand;
