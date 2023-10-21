const {SlashCommandBuilder} = require('discord.js');
const {Score} = require('../data/Score');
const fetch = require('node-fetch-native');
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
   * Asyncronusly gets the url for a gif for the provided wordle game.
   * @param {*} latestGame game to find an image of.
   * @return {string} image url to a gif of undefined if none can be retrieved.
   */
  async getImage(latestGame) {
    let imageToSend;
    if (latestGame?.word && latestGame?.word?.trim() !== '') {
      const tenorApiKey = config.get('tenorApiKey');
      if (tenorApiKey) {
        const url = `https://tenor.googleapis.com/v2/search?key=${tenorApiKey}&q=${latestGame?.word}&limit=1`;
        const response = await fetch(url, {method: 'Get'})
            .then((res) => res?.json())
            .catch((ex) => {
              console.error(ex);
              return null;
            });
        if (response?.results?.[0]?.media_formats?.gif?.url) {
          imageToSend = response?.results?.[0]?.media_formats?.gif?.url;
        } else {
          console.error('Giphy Invalid Response.');
          console.error(response);
        }
      } else {
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
            imageToSend = response?.data?.[0]?.url;
          } else {
            console.error('Giphy Invalid Response.');
            console.error(response);
          }
        }
      }
    }
    return imageToSend;
  }

  /**
     * Calculates and sends the overall average summaries for all players in the game.
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
      console.error('invalid Summary command call. no interaction or channel');
      throw new Error('Invalid Summary call');
    }

    const [overallSummary, day7Summary, lastMonthSummary, latestGameNumber] = await Promise.all([
      this.wordleScore.getPlayerSummaries(guildId, channelId),
      this.wordleScore.getLast7DaysSummaries(guildId, channelId),
      this.wordleScore.getLastMonthSummaries(guildId, channelId),
      this.wordleGame.getLatestGame(),
    ]);
    const [latestGame, latestScores] = await Promise.all([
      this.wordleGame.getWordleGame(latestGameNumber),
      this.wordleScore.getGameScores(latestGameNumber, guildId, channelId),
    ]);
    let imageToSend = this.getImage(latestGame);
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
    const overallLeaderIndex = overallSummary?.[0]?.username === 'Wordle Bot' ? 1 : 0;
    const day7LeaderIndex = day7Summary?.[0]?.username === 'Wordle Bot' ? 1 : 0;
    const lastMonthLeaderIndex = lastMonthSummary?.[0]?.username === 'Wordle Bot' ? 1 : 0;
    let lowestScore = 8;
    const todayByScore = latestScores.reduce((acc, scoreVal) => {
      if (scoreVal.username === 'Wordle Bot') {
        return acc;
      }
      if (lowestScore > +scoreVal.score) {
        lowestScore = +scoreVal.score;
      }
      if (!acc[+scoreVal.score]?.length) {
        acc[+scoreVal.score] = [USER_TO_NAME_MAP[scoreVal.username] || scoreVal.username];
      } else {
        acc[+scoreVal.score].push(USER_TO_NAME_MAP[scoreVal.username] || scoreVal.username);
      }
      return acc;
    }, {});
    const messageToSend = `\`\`\`
${summaryTable.toString()}\`\`\`
    ***Overall Leader: ${USER_TO_NAME_MAP[overallSummary?.[overallLeaderIndex]?.username] || overallSummary?.[overallLeaderIndex]?.username}***
    **7 Day Leader: ${USER_TO_NAME_MAP[day7Summary?.[day7LeaderIndex]?.username] || day7Summary?.[day7LeaderIndex]?.username}**
    **${lastMonthSummary?.[0]?.lastmonth?.trim()} Winner: ${USER_TO_NAME_MAP[lastMonthSummary?.[lastMonthLeaderIndex]?.username] || lastMonthSummary?.[lastMonthLeaderIndex]?.username}**
    **Today's Winners: ${todayByScore[lowestScore]?.join(', ')}**
    ${FOOTER_MESSAGE ? `*${FOOTER_MESSAGE}*`: ''}`;
    imageToSend = await imageToSend;
    if (interaction) {
      await interaction.deferReply({ephemeral: true});
      await interaction.followUp({content: 'Processing...', ephemeral: true});
      if (imageToSend) {
        await interaction.followUp({
          content: messageToSend,
          files: [{
            attachment: imageToSend,
            name: 'SPOILER_FILE.gif',
          }],
        });
      } else {
        await interaction.followUp(messageToSend);
      }
    } else {
      if (imageToSend) {
        await discordWordleChannel.send({
          content: messageToSend,
          files: [{
            attachment: imageToSend,
            name: 'SPOILER_FILE.gif',
          }],
        });
      } else {
        await discordWordleChannel.send(messageToSend);
      }
    }
  }
}

module.exports = SummaryCommand;
