const MonthlyCommand = require('../../src/commands/MonthlyCommand');
const {Score} = require('../../src/data/Score');
jest.spyOn(console, 'error').mockImplementation(() => {});

jest.mock('../../src/data/Score', () => {
  return ({
    Score: {
      getInstance: jest.fn().mockReturnValue({
        getLastMonthSummaries: jest.fn().mockResolvedValue([]),
      }),
    },
  });
});
describe('MonthlyCommand Tests', () => {
  const monthlyCommand = MonthlyCommand.getInstance();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('test no results Channel', async () => {
    const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
    await monthlyCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalledWith('No Montly data found.');
  });
  test('test no results Interaction', async () => {
    const mockedInteraction = {reply: jest.fn().mockResolvedValue()};
    await monthlyCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalledWith('No Montly data found.');
  });
  test('monthly with results Interaction', async () => {
    Score.getInstance().getLastMonthSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      gameslost: '1',
      average: '7',
    }]);
    const mockedInteraction = {reply: jest.fn().mockResolvedValue()};
    await monthlyCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalledWith(`\`\`\`
.---------------------.
| Wordle undefined Summary |
|---------------------|
| User | GP | GL | AS |
|------|----|----|----|
| test | 1  | 1  | 7  |
'---------------------'\`\`\`
    **undefined Winner: test**
    *Brought to you by ...*`);
  });

  test('monthly with results Channel', async () => {
    Score.getInstance().getLastMonthSummaries.mockResolvedValueOnce( [{
      username: 'test',
      games: '1',
      gameslost: '1',
      average: '7',
    }]);
    const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
    await monthlyCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalledWith(`\`\`\`
.---------------------.
| Wordle undefined Summary |
|---------------------|
| User | GP | GL | AS |
|------|----|----|----|
| test | 1  | 1  | 7  |
'---------------------'\`\`\`
    **undefined Winner: test**
    *Brought to you by ...*`);
  });

  test('test invalid command', async () => {
    let error = false;
    try {
      await monthlyCommand.execute(null, null);
    } catch (err) {
      error = true;
    }
    expect(error).toBe(true);
  });
});
