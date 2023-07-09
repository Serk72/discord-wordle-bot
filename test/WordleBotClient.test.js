const {WordleBotClient} = require('../src/WordleBotClient');
const {Score} = require('../src/data/Score');
const {MonthlyCommand, SummaryCommand, WhoLeftCommand} = require('../src/commands');
const fetch = require('node-fetch');

jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.mock('node-fetch', () => {
  return jest.fn().mockResolvedValue({json: () => ({})});
});
jest.mock('../src/data/WordleWord', () => {
  return ({
    WordleWord: {
      getInstance: jest.fn().mockReturnValue({
        getRandomWord: jest.fn().mockResolvedValue('swear'),
      }),
    },
  });
});
jest.mock('../src/data/Score', () => {
  return ({
    Score: {
      getInstance: jest.fn().mockReturnValue({
        getScore: jest.fn().mockResolvedValue(),
        createScore: jest.fn().mockResolvedValue(),
        getTotalPlayers: jest.fn().mockResolvedValue([]),
        getPlayersForGame: jest.fn().mockResolvedValue([]),
      }),
    },
  });
});
jest.mock('../src/data/WordleGame', () => {
  return ({
    WordleGame: {
      getInstance: jest.fn().mockReturnValue({
        getWordleGame: jest.fn().mockResolvedValue(),
        createWordleGame: jest.fn().mockResolvedValue(),
        getLatestGame: jest.fn().mockResolvedValue(745),
        addWord: jest.fn().mockResolvedValue(),
      }),
    },
  });
});
jest.mock('../src/commands/MonthlyCommand', () => {
  return ({
    getInstance: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue(),
      data: {name: 'monthly'},
    }),
  });
});
jest.mock('../src/commands/SummaryCommand', () => {
  return ({
    getInstance: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue(),
      data: {name: 'summary'},
    }),
  });
});
jest.mock('../src/commands/WhoLeftCommand', () => {
  return ({
    getInstance: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue(),
      data: {name: 'wholeft'},
    }),
  });
});
const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
describe('WordleBotClient Tests', () => {
  const wordleBot = new WordleBotClient(mockedDiscordChannel);
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('Empty Message', async () => {
    await wordleBot.messageHandler({});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });
  test('Empty Message In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: ''});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });
  test('WhoLeft In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '!wholeft', delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(1);
  });
  test('WhoLeft In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '/wholeft', delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(1);
  });

  test('Summary In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '!summary', delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(1);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });
  test('Summary In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '/summary', delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(1);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });

  test('Monthly In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '!monthly', delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(1);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });
  test('Monthly In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '/monthly', delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(1);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });

  test('Wordle Score', async () => {
    await wordleBot.messageHandler({author: {username: 'test'}, channelId: '1232', content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`, delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(1);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });

  test('Wordle Score not new', async () => {
    Score.getInstance().getScore.mockResolvedValueOnce({});
    await wordleBot.messageHandler({author: {username: 'test'}, channelId: '1232', content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`, delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });

  test('Wordle Score invalid solution response', async () => {
    fetch.mockResolvedValueOnce(new Error());
    await wordleBot.messageHandler({author: {username: 'test'}, channelId: '1232', content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`, delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(1);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(0);
  });

  test('Wordle Score Insult username left', async () => {
    Score.getInstance().getTotalPlayers.mockResolvedValueOnce(['someUser']);
    await wordleBot.messageHandler({author: {username: 'test'}, channelId: '1232', content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`, delete: ()=>{}});
    expect(MonthlyCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(SummaryCommand.getInstance().execute).toHaveBeenCalledTimes(0);
    expect(WhoLeftCommand.getInstance().execute).toHaveBeenCalledTimes(1);
  });


  test('Edit Event', async () => {
    await wordleBot.editEvent({channelId: '1232', content: '/monthly', delete: ()=>{}}, {channelId: '1232', content: '/monthly', delete: ()=>{}});
  });

  test('Edit Event Wordle', async () => {
    reply = jest.fn().mockResolvedValue();
    await wordleBot.editEvent({author: {username: 'test'}, channelId: '1232', content: '/monthly', delete: ()=>{}}, {author: {username: 'test'}, channelId: '1232', content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`, delete: ()=>{}, lineReply: reply});
    expect(reply).toBeCalledWith('I got you, Edited Wordle Score Counted.');
  });

  test('Edit Event Wordle', async () => {
    Score.getInstance().getScore.mockResolvedValueOnce(1);
    reply = jest.fn().mockResolvedValue();
    await wordleBot.editEvent({author: {username: 'test'}, channelId: '1232', content: '/monthly', delete: ()=>{}}, {author: {username: 'test'}, channelId: '1232', content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`, delete: ()=>{}, lineReply: reply});
    expect(reply).toBeCalledWith('I saw that, Edited Wordle Score Ignored.');
  });
});
