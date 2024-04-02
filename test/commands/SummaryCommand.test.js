const SummaryCommand = require('../../src/commands/SummaryCommand');
const {Score} = require('../../src/data/Score');
const {WordleGame} = require('../../src/data/WordleGame');
const fetch = require('node-fetch-native');
jest.spyOn(console, 'error').mockImplementation(() => {});

jest.mock('node-fetch-native', () => {
  return jest.fn().mockResolvedValue({json: () => ({data: [{url: 'someUrl'}]})});
});
jest.mock('../../src/data/WordleGame', () => {
  return ({
    WordleGame: {
      getInstance: jest.fn().mockReturnValue({
        getWordleGame: jest.fn().mockResolvedValue(),
        createWordleGame: jest.fn().mockResolvedValue(),
        getLatestGame: jest.fn().mockResolvedValue(1),
        summaryPosted: jest.fn().mockResolvedValue(),
      }),
    },
  });
});
jest.mock('../../src/data/Score', () => {
  return ({
    Score: {
      getInstance: jest.fn().mockReturnValue({
        getPlayerSummaries: jest.fn().mockResolvedValue([]),
        getLast7DaysSummaries: jest.fn().mockResolvedValue([]),
        getLastMonthSummaries: jest.fn().mockResolvedValue([]),
        getGameScores: jest.fn().mockResolvedValue([]),
      }),
    },
  });
});
const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
describe('SummaryCommand Tests', () => {
  const summaryCommand = SummaryCommand.getInstance();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('summary with results Interaction', async () => {
    Score.getInstance().getPlayerSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
      totalscore: '7',
    }]);
    Score.getInstance().getLast7DaysSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
    }]);
    const mockedInteraction = {followUp: jest.fn().mockResolvedValue(), deferReply: jest.fn().mockResolvedValue()};
    await summaryCommand.execute(mockedInteraction);
    expect(mockedInteraction.followUp).toBeCalledWith(`\`\`\`
.----------------------.
|    Wordle Summary    |
|----------------------|
| User | GP | AS | 7DA |
|------|----|----|-----|
| test |  1 | 7  | 7   |
'----------------------'\`\`\`
    ***Overall Leader: test***
    **7 Day Leader: test**
    **undefined Winner: undefined**
    **Today's Winners: undefined**
    *Brought to you by ...*`);
  });

  test('summary with results Channel', async () => {
    Score.getInstance().getPlayerSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
      totalscore: '7',
    }]);
    Score.getInstance().getLast7DaysSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
    }]);
    await summaryCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalledWith(`\`\`\`
.----------------------.
|    Wordle Summary    |
|----------------------|
| User | GP | AS | 7DA |
|------|----|----|-----|
| test |  1 | 7  | 7   |
'----------------------'\`\`\`
    ***Overall Leader: test***
    **7 Day Leader: test**
    **undefined Winner: undefined**
    **Today's Winners: undefined**
    *Brought to you by ...*`);
  });

  test('summary with results Channel with giphy link', async () => {
    Score.getInstance().getPlayerSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
      totalscore: '7',
    }]);
    Score.getInstance().getLast7DaysSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
    }]);
    WordleGame.getInstance().getWordleGame.mockResolvedValueOnce( {
      word: 'tests',
    });
    await summaryCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalledWith({content: `\`\`\`
.----------------------.
|    Wordle Summary    |
|----------------------|
| User | GP | AS | 7DA |
|------|----|----|-----|
| test |  1 | 7  | 7   |
'----------------------'\`\`\`
    ***Overall Leader: test***
    **7 Day Leader: test**
    **undefined Winner: undefined**
    **Today's Winners: undefined**
    *Brought to you by ...*`, files: [{attachment: 'someUrl', name: 'SPOILER_FILE.gif'}]});
  });
  test('summary with results Channel with giphy link error', async () => {
    fetch.mockResolvedValueOnce(new Error());
    Score.getInstance().getPlayerSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
      totalscore: '7',
    }]);
    Score.getInstance().getLast7DaysSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      average: '7',
    }]);
    WordleGame.getInstance().getWordleGame.mockResolvedValueOnce( {
      word: 'tests',
    });
    await summaryCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalledWith(`\`\`\`
.----------------------.
|    Wordle Summary    |
|----------------------|
| User | GP | AS | 7DA |
|------|----|----|-----|
| test |  1 | 7  | 7   |
'----------------------'\`\`\`
    ***Overall Leader: test***
    **7 Day Leader: test**
    **undefined Winner: undefined**
    **Today's Winners: undefined**
    *Brought to you by ...*`);
  });

  test('test invalid command', async () => {
    let error = false;
    try {
      await summaryCommand.execute(null, null);
    } catch (err) {
      error = true;
    }
    expect(error).toBe(true);
  });
});
