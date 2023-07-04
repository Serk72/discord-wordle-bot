const MonthlyCommand = require('../../src/commands/MonthlyCommand');
const {Score} = require('../../src/data/Score');
jest.mock('../../src/data/Score', () => {
  return ({
    Score: {
      getInstance: jest.fn().mockReturnValue({
        getLastMonthSummaries: jest.fn().mockResolvedValue([]),
      }),
    },
  });
});
const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
describe('MonthlyCommand Tests', () => {
  const monthlyCommand = new MonthlyCommand(mockedDiscordChannel);
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('test no results Channel', async () => {
    await monthlyCommand.execute();
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
    await monthlyCommand.execute();
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
});
