const {WordleBotClient} = require('../src/WordleBotClient');
const {Score} = require('../src/data/Score');
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
        getLatestGame: jest.fn().mockResolvedValue(1),
      }),
    },
  });
});
const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
describe('WordleBotClient Tests', () => {
  const monthlyCommand = {execute: jest.fn().mockResolvedValue()};
  const summaryCommand = {execute: jest.fn().mockResolvedValue()};
  const whoLeftCommand = {execute: jest.fn().mockResolvedValue()};
  const wordleBot = new WordleBotClient(mockedDiscordChannel, monthlyCommand, summaryCommand, whoLeftCommand);
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('Empty Message', async () => {
    await wordleBot.messageHandler({});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(0);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(0);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(0);
  });
  test('Empty Message In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: ''});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(0);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(0);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(0);
  });
  test('WhoLeft In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '!wholeft', delete: ()=>{}});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(0);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(0);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(1);
  });
  test('WhoLeft In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '/wholeft', delete: ()=>{}});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(0);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(0);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(1);
  });

  test('Summary In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '!summary', delete: ()=>{}});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(0);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(1);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(0);
  });
  test('Summary In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '/summary', delete: ()=>{}});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(0);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(1);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(0);
  });

  test('Monthly In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '!monthly', delete: ()=>{}});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(1);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(0);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(0);
  });
  test('Monthly In wordle Channel', async () => {
    await wordleBot.messageHandler({channelId: '1232', content: '/monthly', delete: ()=>{}});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(1);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(0);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(0);
  });

  test('Wordle Score', async () => {
    await wordleBot.messageHandler({author: {username: 'test'}, channelId: '1232', content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`, delete: ()=>{}});
    expect(monthlyCommand.execute).toHaveBeenCalledTimes(0);
    expect(summaryCommand.execute).toHaveBeenCalledTimes(1);
    expect(whoLeftCommand.execute).toHaveBeenCalledTimes(0);
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
