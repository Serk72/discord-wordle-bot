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
  static _instance;
  /**
   * Singleton instance.
   * @return {MonthlyCommand} the singleton instance
   */
  static getInstance() {
    if (!MonthlyCommand._instance) {
      MonthlyCommand._instance = new MonthlyCommand();
    }
    return MonthlyCommand._instance;
  }
  static data = new SlashCommandBuilder()
      .setName('monthly')
      .setDescription('Displays last months wordle summary.');
    /**
     * Constructor.
     */
  constructor() {
    this.wordleScore = Score.getInstance();
    this.data = MonthlyCommand.data;
  }

  /**
     * Calculates and sends the monthly summary for all plays for last month.
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
      console.error('invalid monthly command call. no interaction or channel');
      throw new Error('Invalid monthly call');
    }
    const lastMonthSummary = await this.wordleScore.getLastMonthSummaries(guildId, channelId);
    if (!lastMonthSummary.length) {
      if (interaction) {
        await interaction.reply('No Montly data found.');
      } else {
        await discordWordleChannel.send('No Montly data found.');
      }
      return;
    }
    const summaryTable = new AsciiTable(`Wordle ${lastMonthSummary?.[0]?.lastmonth?.trim()} Summary`);
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
      await discordWordleChannel.send(messageToSend);
    }
  }
}

module.exports = MonthlyCommand;
