const WhoLeftCommand = require('../../src/commands/WhoLeftCommand');
const {Score} = require('../../src/data/Score');
jest.mock('../../src/data/Score', () => {
  return ({
    Score: {
      getInstance: jest.fn().mockReturnValue({
        getTotalPlayers: jest.fn().mockResolvedValue([]),
        getPlayersForGame: jest.fn().mockResolvedValue([]),
      }),
    },
  });
});
jest.mock('../../src/data/WordleGame', () => {
  return ({
    WordleGame: {
      getInstance: jest.fn().mockReturnValue({
        getLatestGame: jest.fn().mockResolvedValue(1),
      }),
    },
  });
});
const mockedDiscordChannel = {send: jest.fn().mockResolvedValue()};
describe('WhoLeftCommand Tests', () => {
  const whoLeftCommand = WhoLeftCommand.getInstance();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('Everyone done, empty respons Channel', async () => {
    await whoLeftCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalled();
  });

  test('Everyone done, empty respons Interaction', async () => {
    const mockedInteraction = {reply: jest.fn().mockResolvedValue()};
    await whoLeftCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalled();
  });

  test('1 left Channel', async () => {
    Score.getInstance().getTotalPlayers.mockResolvedValueOnce(['test']);
    await whoLeftCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalled();
  });

  test('multiple left Channel', async () => {
    Score.getInstance().getTotalPlayers.mockResolvedValueOnce(['test', 'test2']);
    await whoLeftCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalled();
  });

  test('insult user left Channel', async () => {
    Score.getInstance().getTotalPlayers.mockResolvedValueOnce(['someUser']);
    await whoLeftCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalled();
  });
});
