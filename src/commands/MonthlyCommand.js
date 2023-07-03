const {SlashCommandBuilder} = require('discord.js');
const AsciiTable = require('ascii-table');
const config = require('config');
const {Score} = require('../data/Score');

const USER_TO_NAME_MAP = config.get('userToNameMap');
const FOOTER_MESSAGE = config.get('footerMessage');

/**
 * Command for displaying last month averages.
 */
class MonthlyCommand {
  static data = new SlashCommandBuilder()
      .setName('monthly')
      .setDescription('Displays last months wordle summary.');
    /**
     * Constructor.
     * @param {*} discordWordleChannel Discord channel to send messages to if not an interaction with a command.
     */
  constructor(discordWordleChannel) {
    this.wordleScore = Score.getInstance();
    this.discordWordleChannel = discordWordleChannel;
    this.data = MonthlyCommand.data;
  }

  /**
     * Calculates and sends the monthly summary for all plays for last month.
     * @param {*} interaction discord interaction if specified the command will reply too.
     */
  async execute(interaction) {
    const lastMonthSummary = await this.wordleScore.getLastMonthSummaries();
    const summaryTable = new AsciiTable(`Wordle ${lastMonthSummary?.[0]?.lastmonth} Summary`);
    summaryTable.setHeading('User', 'GP', 'GL', 'AS');
    lastMonthSummary.forEach((row) => {
      summaryTable.addRow(
          USER_TO_NAME_MAP[row.username] || row.username,
          row.games,
          row.gameslost,
          row.average);
    });
    const messageToSend = `\`\`\`
${summaryTable.toString()}\`\`\`
    **${lastMonthSummary?.[0]?.lastmonth?.trim()} Winner: ${USER_TO_NAME_MAP[lastMonthSummary?.[0]?.username] || lastMonthSummary?.[0]?.username}**
    ${FOOTER_MESSAGE ? `*${FOOTER_MESSAGE}*`: ''}`;

    if (interaction) {
      await interaction.reply(messageToSend);
    } else {
      await this.discordWordleChannel.send(messageToSend);
    }
  }
}

module.exports = MonthlyCommand;
