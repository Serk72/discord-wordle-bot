const {SlashCommandBuilder} = require('discord.js');
const {WordleGame} = require('../data/WordleGame');
const {Score} = require('../data/Score');
const config = require('config');
const AsciiTable = require('ascii-table');
const {SimpleLinearRegression} = require('ml-regression');
const USER_TO_NAME_MAP = config.get('userToNameMap');

/**
 * Command for running predictions on how users are expected to score on a given wordle word.
 */
class ScorePredictorCommand {
  static _instance;
  /**
   * Singleton instance.
   * @return {ScorePredictorCommand} the singleton instance
   */
  static getInstance() {
    if (!ScorePredictorCommand._instance) {
      ScorePredictorCommand._instance = new ScorePredictorCommand();
    }
    return ScorePredictorCommand._instance;
  }
  static data = new SlashCommandBuilder()
      .setName('predict')
      .addStringOption((option) =>
        option.setName('word')
            .setDescription('The word to run predictions on, when not passes latest wordle game is used.'))
      .setDescription('Predicts what each user should score on the given word, latest wordle game updated 1am EST.');
  /**
   * Constructor.
   */
  constructor() {
    this.wordleGame = WordleGame.getInstance();
    this.wordleScore = Score.getInstance();
    this.data = ScorePredictorCommand.data;
  }

  /**
   * Determines what players have not completed the days wordle and senda a message
   * indicated players that have not finished yet to the WORDLE_CHANNEL_ID channel.
   * @param {*} interaction discord interaction if specified the command will reply too.
   */
  async execute(interaction) {
    let guildId;
    let channelId;
    if (interaction) {
      guildId = interaction.guildId;
      channelId = interaction.channelId;
    } else {
      console.error('invalid ScorePredictorCommand command call. no interaction or channel');
      throw new Error('Invalid ScorePredictorCommand call');
    }
    await interaction.deferReply({ephemeral: true});
    await interaction.followUp({content: 'Calculating Score predections...', ephemeral: true});
    let word = interaction.options.getString('word');
    if (!word) {
      word = (await this.wordleGame.getWordleGame((await this.wordleGame.getLatestGame()))).word;
    }
    if (!word) {
      await interaction.followUp({content: 'No Word found to predict.', ephemeral: true});
      return;
    }
    const totalPlayes = await this.wordleScore.getTotalPlayers(guildId, channelId);

    if (!totalPlayes.length) {
      await interaction.followUp({content: 'No user scores found to predict.', ephemeral: true});
      return;
    }

    const calculateStringVal = (string) => {
      let val = 0;
      for (let i = 0; i < string.length; i++) {
        val += string.charCodeAt(i);
      }
      return val;
    };
    const summaryTable = new AsciiTable('Wordle Summary');
    summaryTable.setHeading('User', 'Prediction');
    await Promise.all(totalPlayes.map(async (user) => {
      const X = [];
      const y = [];
      const pastScores = await this.wordleScore.getPlayerScores(user, guildId, channelId);
      pastScores.forEach((playerScore) => {
        X.push(calculateStringVal(playerScore.word));
        y.push(playerScore.score);
      });
      const model = new SimpleLinearRegression(X, y);
      const prediction = model.predict(calculateStringVal(word));
      summaryTable.addRow(
          USER_TO_NAME_MAP[user] || user,
        prediction <= 6 ? prediction.toFixed(0) : 'To Loose');
    }));


    await interaction.followUp({content: `\`\`\`
${summaryTable.toString()}\`\`\``, ephemeral: true});
  }
}

module.exports = ScorePredictorCommand;
