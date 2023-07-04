const SummaryCommand = require('../../src/commands/SummaryCommand');
const {Score} = require('../../src/data/Score');
jest.mock('../../src/data/Score', () => {
  return ({
    Score: {
      getInstance: jest.fn().mockReturnValue({
        getPlayerSummaries: jest.fn().mockResolvedValue([]),
        getLast7DaysSummaries: jest.fn().mockResolvedValue([]),
        getLastMonthSummaries: jest.fn().mockResolvedValue([]),
      }),
    },
  });
});
const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
describe('SummaryCommand Tests', () => {
  const summaryCommand = new SummaryCommand(mockedDiscordChannel);
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
    const mockedInteraction = {reply: jest.fn().mockResolvedValue()};
    await summaryCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalledWith(`\`\`\`
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
    *Overall Average=7*
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
    await summaryCommand.execute();
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
    *Overall Average=7*
    *Brought to you by ...*`);
  });
});
