const {SlashCommandBuilder} = require('discord.js');
const {Score} = require('../data/Score');
const AsciiTable = require('ascii-table');
const config = require('config');

const FOOTER_MESSAGE = config.get('footerMessage');
const USER_TO_NAME_MAP = config.get('userToNameMap');

/**
 * Command for dispalying summary table for wordle averages.
 */
class SummaryCommand {
  static data = new SlashCommandBuilder()
      .setName('summary')
      .setDescription('Displays the current summary (message displated each day)');
    /**
     * Constructor.
     * @param {*} discordWordleChannel Discord channel to send messages to if not an interaction with a command.
     */
  constructor(discordWordleChannel) {
    this.wordleScore = Score.getInstance();
    this.discordWordleChannel = discordWordleChannel;
    this.data = SummaryCommand.data;
  }

  /**
     * Calculates and sends the overall average summaries for all players in the game.
     * @param {*} interaction discord interaction if specified the command will reply too.
     */
  async execute(interaction) {
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
    const overallAverage = score / gamesPlayed;
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

    const messageToSend = `\`\`\`
${summaryTable.toString()}\`\`\`
    ***Overall Leader: ${USER_TO_NAME_MAP[overallSummary[0].username] || overallSummary[0].username}***
    **7 Day Leader: ${USER_TO_NAME_MAP[day7Summary[0].username] || day7Summary[0].username}**
    **${lastMonthSummary?.[0]?.lastmonth?.trim()} Winner: ${USER_TO_NAME_MAP[lastMonthSummary?.[0]?.username] || lastMonthSummary?.[0]?.username}**
    *Overall Average=${overallAverage}*
    ${FOOTER_MESSAGE ? `*${FOOTER_MESSAGE}*`: ''}`;

    if (interaction) {
      interaction.reply(messageToSend);
    } else {
      await this.discordWordleChannel.send(messageToSend);
    }
  }
}

module.exports = SummaryCommand;
