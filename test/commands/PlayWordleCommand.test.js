const PlayWordleCommand = require('../../src/commands/PlayWordleCommand');
const mockedPlay = jest.fn().mockResolvedValue('Played');
jest.mock('../../src/WordlePlayer', () => {
  return {
    WordlePlayer: jest.fn().mockImplementation(() => {
      return {playGame: mockedPlay};
    }),
  };
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
describe('PlayWordleCommand Tests', () => {
  const playWordleCommand = PlayWordleCommand.getInstance();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('play through channel', async () => {
    await playWordleCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalledWith('Played');
  });

  test('play through Interaction', async () => {
    const mockedInteraction = {reply: jest.fn().mockResolvedValue(), options: {getInteger: jest.fn().mockReturnValue(1)}};
    await playWordleCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalledWith('Played');
  });

  test('play through channel failed game', async () => {
    mockedPlay.mockResolvedValueOnce(false);
    await playWordleCommand.execute(null, mockedDiscordChannel);
    expect(mockedDiscordChannel.send).toBeCalledWith('Unable to play Wordle Game: 1');
  });
});
