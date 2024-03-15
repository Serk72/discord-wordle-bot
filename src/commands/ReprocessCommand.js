const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {WordleGame} = require('../data/WordleGame');
const {Score} = require('../data/Score');

const WORDLE_REGEX = /Wordle [0-9]* [0-6Xx]\/[0-6]\*?/g;

/**
 * Command for displaying last month averages.
 */
class ReprocessCommand {
  static _instance;
  /**
   * Singleton instance.
   * @return {ReprocessCommand} the singleton instance
   */
  static getInstance() {
    if (!ReprocessCommand._instance) {
      ReprocessCommand._instance = new ReprocessCommand();
    }
    return ReprocessCommand._instance;
  }
  static data = new SlashCommandBuilder()
      .setName('process_old_messages')
      .setDescription('Processes messages in the channel for wordle scores to store. Will not alter existing scores');
    /**
     * Constructor.
     */
  constructor() {
    this.wordleGame = WordleGame.getInstance();
    this.wordleScore = Score.getInstance();
    this.data = ReprocessCommand.data;
  }

  /**
     * Reads all messages in the discordWordleChannel to find and store all Wordle scores.
    * This method should only be run once when first loading the bot to get all historical scores.
     * @param {*} interaction discord interaction if specified the command will reply too.
     */
  async execute(interaction) {
    let guildId;
    let channelId;
    if (interaction) {
      guildId = interaction.guildId;
      channelId = interaction.channelId;
    } else {
      console.error('invalid Reprocess command call. no interaction or channel');
      throw new Error('Invalid Reprocess call');
    }

    interaction.deferReply({ephemeral: true});
    interaction.followUp({content: 'Starting Reprocess... Existing scores will not be altered.', ephemeral: true});
    const discordWordleChannel = interaction.channel;

    let tempMessages = await discordWordleChannel.messages.fetch({limit: 50});
    const messages = [];
    while (tempMessages.size > 0) {
      tempMessages.forEach((msg) => messages.push(msg));
      tempMessages = await discordWordleChannel.messages.fetch({before: tempMessages.last().id});
    }
    const processedMessages = messages.length;
    let wordleMessages = 0;
    let newScores = 0;
    await Promise.all(messages?.map(async (message) => {
      const found = message?.content?.match(WORDLE_REGEX);
      if (found && found.length) {
        wordleMessages++;
        const wordle = found[0];
        const subWordle = wordle.substring(wordle.indexOf(' ')+1);
        const wordleNumber = Number(subWordle.substring(0, subWordle.indexOf(' ')).replaceAll(',', ''));

        if (!(await this.wordleGame.getWordleGame(wordleNumber))) {
          await this.wordleGame.createWordleGame(wordleNumber, message.createdTimestamp);
        }

        if (!(await this.wordleScore.getScore(message.author.username, wordleNumber, guildId, channelId))) {
          newScores++;
          await this.wordleScore.createScore(message.author.username, message.author.tag, wordle, wordleNumber, message.createdTimestamp, guildId, channelId);
        }
      }
    }));
    const embed = new EmbedBuilder()
        .setTitle(`Finished processing messages.`)
        .setColor('#4169e1'); // set the color of the em
    embed.setDescription(`Processed ${processedMessages} messages. Found ${wordleMessages} wordle scores. Added ${newScores} new Scores.`);
    await interaction.followUp({embeds: [embed]});
  }
}

module.exports = ReprocessCommand;
