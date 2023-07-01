const { Client, GatewayIntentBits, EmbedBuilder, Events, Collection, userMention, bold, italic, underscore   } = require('discord.js');
const { WordleGame } = require('./data/WordleGames');
const { Score } = require('./data/Scores');
const { Summary } = require('./data/Summary');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent] });
const config = require('config');


let wordleGame = new WordleGame();
let wordleScore = new Score();
let savedSummary = new Summary();
const INSULT_USERNAME = config.get('insultUserName');
const WORDLE_CHANNEL_ID = config.get('wordleMonitorChannelID');
const FOOTER_MESSAGE = config.get('footerMessage');
let whoIsLeft = async () => {
  await wordleGame.connect();
  await wordleScore.connect();
  const wordleChannel = client.channels.cache.get(WORDLE_CHANNEL_ID);
  const latestGame = await wordleGame.getLatestGame();
  let totalPlayes = await wordleScore.getTotalPlayers()
  let gamePlayers = await wordleScore.getPlayersForGame(latestGame)
  let embed;
  if (totalPlayes.length === gamePlayers.length) {
    embed = new EmbedBuilder()
    .setTitle(`Everyone is done with ${latestGame}`)
    .setColor('#4169e1'); // set the color of the em
    embed.setDescription(`All done.`)
    if (FOOTER_MESSAGE){
      embed.setFooter({ text: FOOTER_MESSAGE } );
    }
    
  } else {
    if (totalPlayes.length - gamePlayers.length === 1){
      let remaining = totalPlayes.filter((player) => !gamePlayers.includes(player))
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
                let caseyMessages = [
                  `Is too lazy to complete Wordle ${latestGame}`,
                  `Is holding everone else back on Wordle ${latestGame}, he's the worst`,
                  `Is the worst. Complete Wordle ${latestGame} already!`,
                  `Has time to edit discord names but not complete Wordle ${latestGame}`,
                  `As per usual has not completed Wordle ${latestGame}`
                ]
                const randomIndex = Math.floor(Math.random() * 5);

         embed.addFields({name: `${player}`, value: caseyMessages[randomIndex]});
        } else {
         embed.addFields({name: `${player}`, value: `Has not completed Wordle ${latestGame}`});
        }
    })
    if (FOOTER_MESSAGE){
      embed.setFooter({ text: FOOTER_MESSAGE } );
    }
  }


  wordleChannel.send({ embeds: [embed] });
  await wordleGame.disconnect();
  await wordleScore.disconnect();
}
let sendSQLMonthly = async () => {
  await wordleScore.connect();
  const wordleChannel = client.channels.cache.get(WORDLE_CHANNEL_ID);
  let lastMonthSummary = await wordleScore.getLastMonthSummaries();

  let embed = new EmbedBuilder()
  .setTitle(`Wordle ${lastMonthSummary?.[0]?.lastmonth} Summary`)
  .setColor('#4169e1'); // set the color of the em
  lastMonthSummary.forEach((row) => {
    let totalGames = row.games;
    embed.addFields({name: `${underscore(italic(bold(row.username)))}`,
    value: `${bold('Games Played')}: ${totalGames}
    ${bold('Games Lost')}: ${row.gameslost}
    ${bold('Average Score')}: ${row.average}
    `});
  })
  embed.setDescription(`Wordle ${lastMonthSummary?.[0]?.lastmonth} Scores`)
  if (FOOTER_MESSAGE){
    embed.setFooter({ text: FOOTER_MESSAGE } );
  }
  await wordleChannel.send({ embeds: [embed] });
}
let sendSQLSummary = async () => {
  await wordleScore.connect();
  const wordleChannel = client.channels.cache.get(WORDLE_CHANNEL_ID);
  let overallSummary = await wordleScore.getPlayerSummaries();
  let day7Summary = await wordleScore.getLast7DaysSummaries();
  let score = 0;
  let gamesPlayed = 0;
  overallSummary.forEach((row) => {
    score += +row.totalscore;
    gamesPlayed += +row.games;
  });
  let bayesianC = +(overallSummary[overallSummary.length-2].games);
  const overallAverage = score / gamesPlayed;
  let embed = new EmbedBuilder()
  .setTitle('Wordle Summary')
  .setColor('#4169e1'); // set the color of the em
  overallSummary.forEach((row) => {
    let totalGames = +row.games;
    embed.addFields({name: `${underscore(italic(bold(row.username)))}`,
    value: `${bold('Games Played')}: ${totalGames}
    ${bold('Games Lost')}: ${row.gameslost}
    ${bold('Average Score')}: ${row.average}
    ${bold('Bayesian Score')}: ${((+row.totalscore + (bayesianC * overallAverage))/(totalGames + bayesianC)).toFixed(2)}
    `});
  })
  embed.setDescription(`Wordle current scores.`)
  embed.setFooter({ text: `${FOOTER_MESSAGE ? `${FOOTER_MESSAGE},`: ''} Baysian m=${overallAverage} C=${bayesianC}` } );
  await wordleChannel.send({ embeds: [embed] });
  embed = new EmbedBuilder()
  .setTitle('Wordle Last 7 days Summary')
  .setColor('#4169e1'); // set the color of the em
  day7Summary.forEach((row) => {
    let totalGames = row.games;
    embed.addFields({name: `${underscore(italic(bold(row.username)))}`,
    value: `${bold('Games Played')}: ${totalGames}
    ${bold('Games Lost')}: ${row.gameslost}
    ${bold('Average Score')}: ${row.average}
    `});
  })
  embed.setDescription(`Wordle 7 day scores.`)
  if (FOOTER_MESSAGE){
    embed.setFooter({ text: FOOTER_MESSAGE } );
  }
  await wordleChannel.send({ embeds: [embed] });
}
let sendSummary = async (wordleSummary, detailed = false) => {
  await savedSummary.connect();
  if (!wordleSummary) {
    wordleSummary = (await savedSummary.getSummary())?.summary;
  }
  const wordleChannel = client.channels.cache.get(WORDLE_CHANNEL_ID);
  let score = 0;
  let gamesPlayed = 0;
  let scoredUsers = Object.keys(wordleSummary);
  scoredUsers.forEach((user) => {
    score += wordleSummary[user].score;
    gamesPlayed += wordleSummary[user].games?.length || wordleSummary[user].games;
  });
  let sortedUsers = scoredUsers.sort((userA, userB) => (wordleSummary[userB].games?.length || wordleSummary[userB].games)- (wordleSummary[userA].games?.length || wordleSummary[userA].games));
  let bayesianC = wordleSummary[sortedUsers[sortedUsers.length-2]].games?.length || wordleSummary[sortedUsers[sortedUsers.length-2]].games
  const overallAverage = score / gamesPlayed;
  const embed = new EmbedBuilder()
  .setTitle('Wordle Summary')
  .setColor('#4169e1'); // set the color of the em
  Object.keys(wordleSummary).forEach((user) => {
    let totalGames = wordleSummary[user].games?.length || wordleSummary[user].games;
    if (detailed) {
      embed.addFields({name: `${underscore(italic(bold(user)))}`,
            value: `            ${bold('Games Played')}: ${totalGames}
            ${bold('Games Lost')}: ${wordleSummary[user].gamesLost}
            ${bold('Score')}: ${wordleSummary[user].score}/${totalGames * 6}
            ${bold('Calculated')}: ${(wordleSummary[user].score/(totalGames * 6)).toFixed(2)}
            ${bold('Hard Games')}: ${wordleSummary[user].hardGames?.length || wordleSummary[user].hardGames}
            ${bold('Hard Score')}: ${wordleSummary[user].hardScore}/${(wordleSummary[user].hardGames?.length || wordleSummary[user].hardGames) * 6}
            ${bold('Hard Calculated')}:  ${(wordleSummary[user].hardScore/((wordleSummary[user].hardGames?.length || wordleSummary[user].hardGames) * 6)).toFixed(2)}
            `});
    } else {
      embed.addFields({name: `${underscore(italic(bold(user)))}`,
      value: `${bold('Games Played')}: ${totalGames}
      ${bold('Games Lost')}: ${wordleSummary[user].gamesLost}
      ${bold('Average Score')}: ${(wordleSummary[user].score/(totalGames)).toFixed(2)}
      ${bold('Bayesian Score')}: ${((wordleSummary[user].score + (bayesianC * overallAverage))/(totalGames + bayesianC)).toFixed(2)}
      `});
    }
  })
  embed.setDescription(`Wordle current scores.`)
  embed.setFooter({ text: `${FOOTER_MESSAGE ? `${FOOTER_MESSAGE},`: ''} Baysian m=${overallAverage} C=${bayesianC}` } );

  wordleChannel.send({ embeds: [embed] });
  await savedSummary.disconnect();
}
let readAllMessages = async () => {
  const wordleChannel = client.channels.cache.get(WORDLE_CHANNEL_ID);
  let wordleSummary = {};
  let tempMessages = await wordleChannel.messages.fetch({ limit: 50 });
  let messages = [];
  while (tempMessages.size > 0)
  {
    tempMessages.forEach(msg => messages.push(msg));
    tempMessages = await wordleChannel.messages.fetch({ before: tempMessages.last().id });
  }
  await wordleGame.connect();
  await wordleScore.connect();
  await savedSummary.connect();
 for (index in messages) {
  let message = messages[index];
  let regex = /Wordle [0-9]* [0-6Xx]\/[0-6]\*?/g
  const found = message?.content?.match(regex);
  if (found && found.length) {
    if (!wordleSummary[message.author.username]) {
      wordleSummary[message.author.username] = {
        games: 0,
        hardGames: 0,
        score: 0,
        hardScore: 0,
        gamesLost: 0,
        tag: message.author.tag,
        id: message.author.id
      };
    }
    if (!wordleSummary[message.author.username].id) {
      wordleSummary[message.author.username].id = message.author.id
    }
    let wordle = found[0];
    let subWordle = wordle.substring(wordle.indexOf(' ')+1);
    let wordleNumber = Number(subWordle.substring(0,subWordle.indexOf(' ')))

    if (!(await wordleGame.getWordleGame(wordleNumber))) {
      await wordleGame.createWordleGame(wordleNumber, message.createdTimestamp);
    }

    if (wordle.includes('*')) {
      if (wordleSummary[message.author.username].hardGames?.length) {
        wordleSummary[message.author.username].hardGames = wordleSummary[message.author.username].hardGames.length;
      }
      wordleSummary[message.author.username].hardGames++;
    }
    if (wordleSummary[message.author.username].games?.length) {
      wordleSummary[message.author.username].games = wordleSummary[message.author.username].games.length;
    }
    wordleSummary[message.author.username].games++;


    let score = Number(subWordle.substring(subWordle.indexOf(' ') + 1, subWordle.indexOf('/')));
    if (Number.isNaN(score)) {
      wordleSummary[message.author.username].score += 7
      wordleSummary[message.author.username].gamesLost++;
    } else {
      wordleSummary[message.author.username].score += score;
    }

    if (wordle.includes('*')) {
      if (Number.isNaN(score)) {
        wordleSummary[message.author.username].hardScore += 7
      } else {
        wordleSummary[message.author.username].hardScore += score;
      }
    }

    if (!(await wordleScore.getScore(message.author.username, wordleNumber))) {
      await wordleScore.createScore(message.author.username, message.author.tag, wordle, wordleNumber, message.createdTimestamp)
    }
  }
 }


  await savedSummary.createSummary(wordleSummary);
  await wordleGame.disconnect();
  await wordleScore.disconnect();
  await savedSummary.disconnect();

}

let addWorldScore = async (message) => {
  await wordleGame.connect();
  await wordleScore.connect();
  await savedSummary.connect();
  let regex = /Wordle [0-9]* [0-6Xx]\/[0-6]\*?/g
  const found = message?.content?.match(regex);
  let wordleSummary = (await savedSummary.getSummary())?.summary;
  if (!wordleSummary[message.author.username]) {
    wordleSummary[message.author.username] = {
      games: [],
      hardGames: [],
      score: 0,
      hardScore: 0,
      gamesLost: 0,
      tag: message.author.tag
    };
  }
  let wordle = found[0];
  let subWordle = wordle.substring(wordle.indexOf(' ')+1);
  let wordleNumber = Number(subWordle.substring(0,subWordle.indexOf(' ')))

  if (!(await wordleGame.getWordleGame(wordleNumber))) {
    await wordleGame.createWordleGame(wordleNumber, message.createdTimestamp);
  }

  if (wordle.includes('*')) {
    if (wordleSummary[message.author.username].hardGames?.length) {
      wordleSummary[message.author.username].hardGames = wordleSummary[message.author.username].hardGames.length;
    }
    wordleSummary[message.author.username].hardGames++;
  }
  if (wordleSummary[message.author.username].games?.length) {
    wordleSummary[message.author.username].games = wordleSummary[message.author.username].games.length;
  }
  wordleSummary[message.author.username].games++;


  let score = Number(subWordle.substring(subWordle.indexOf(' ') + 1, subWordle.indexOf('/')));
  if (Number.isNaN(score)) {
    wordleSummary[message.author.username].score += 7
    wordleSummary[message.author.username].gamesLost++;
  } else {
    wordleSummary[message.author.username].score += score;
  }

  if (wordle.includes('*')) {
    if (Number.isNaN(score)) {
      wordleSummary[message.author.username].hardScore += 7
    } else {
      wordleSummary[message.author.username].hardScore += score;
    }
  }

  if (!(await wordleScore.getScore(message.author.username, wordleNumber))) {
    await wordleScore.createScore(message.author.username, message.author.tag, wordle, wordleNumber, message.createdTimestamp)
  }
  await savedSummary.createSummary(wordleSummary);

  const latestGame = await wordleGame.getLatestGame();
  let totalPlayes = await wordleScore.getTotalPlayers()
  let gamePlayers = await wordleScore.getPlayersForGame(latestGame)
  let remaining = totalPlayes.filter((player) => !gamePlayers.includes(player))
  console.log(remaining)
  if (!remaining.length) {
    await sendSQLSummary(wordleSummary, false);
  } else if (remaining.length === 1){
    if (remaining[0] === INSULT_USERNAME) {
      await whoIsLeft();
    }
  }

  await wordleGame.disconnect();
  await wordleScore.disconnect();
  await savedSummary.disconnect();
};


client.on(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Connected to ${client.guilds.cache.size} guilds`);
  //readAllMessages();
  //await wordleScore.connect();
  //await wordleScore.setAllScores();
  //await wordleScore.disconnect();
  //await readAllMessages();
  //client.user.setUsername('Wordle Bot');
  //client.user.setAvatar('https://assets-prd.ignimgs.com/2022/04/15/wordle-1650045194490.jpg?width=300&crop=1%3A1%2Csmart');

});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  console.log('edit Event.')
  console.log(oldMessage?.content);
  console.log(newMessage?.content);
  let regex = /Wordle [0-9]* [0-6Xx]\/[0-6]\*?/g
  const found = newMessage?.content?.match(regex);
  if (found && found.length) {
    await wordleScore.connect();
    if ((await wordleScore.getScore(newMessage.author.username, wordleNumber))) {
      await wordleScore.disconnect();
      newMessage.lineReply('I saw that, Edited Wordle Score Ignored.');
    } else {
      await wordleScore.disconnect();
      await addWorldScore(newMessage);
      newMessage.lineReply('I got you, Edited Wordle Score Counted.');
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content.startsWith('!whoLeft') || message.content.startsWith('/whoLeft')) {
    message.delete();
    await whoIsLeft();
    return;
  }
  if (message.content.startsWith('!summary') || message.content.startsWith('/summary')) {
    let detailed = message.content.includes('detailed');
    message.delete();
    await sendSQLSummary(undefined, detailed);
    return;
  }
  if (message.content.startsWith('!monthly') || message.content.startsWith('/monthly')) {
    let detailed = message.content.includes('detailed');
    message.delete();
    await sendSQLMonthly(undefined, detailed);
    return;
  }
  if (message.channelId === WORDLE_CHANNEL_ID) {
    let regex = /Wordle [0-9]* [0-6Xx]\/[0-6]\*?/g
    const found = message?.content?.match(regex);
    if (found && found.length) {
      await addWorldScore(message);
    }
  }
});


client.login(config.get('discordBotToken'));
