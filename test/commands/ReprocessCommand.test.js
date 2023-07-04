const ReprocessCommand = require('../../src/commands/ReprocessCommand');
const {Collection} = require('discord.js');

jest.mock('../../src/data/Score', () => {
  return ({
    Score: {
      getInstance: jest.fn().mockReturnValue({
        getTotalPlayers: jest.fn().mockResolvedValue([]),
        getPlayersForGame: jest.fn().mockResolvedValue([]),
        getScore: jest.fn().mockResolvedValue(),
        createScore: jest.fn().mockResolvedValue(),
      }),
    },
  });
});
jest.mock('../../src/data/WordleGame', () => {
  return ({
    WordleGame: {
      getInstance: jest.fn().mockReturnValue({
        getLatestGame: jest.fn().mockResolvedValue(1),
        getWordleGame: jest.fn().mockResolvedValue(),
        createWordleGame: jest.fn().mockResolvedValue(),
      }),
    },
  });
});
describe('ReprocessCommand Tests', () => {
  const reprocessCommand = ReprocessCommand.getInstance();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Reprocess on unsupported channel', async () => {
    const mockedInteraction = {
      channelId: 'wrongId',
      reply: jest.fn().mockResolvedValue(),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue([]),
        },
        send: jest.fn().mockResolvedValue(),
      },
    };
    await reprocessCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalledWith('Reprocessing Only supported for the configured Wordle Channel.');
  });

  test('Reprocess with no messages', async () => {
    const mockedInteraction = {
      channelId: '1232',
      reply: jest.fn().mockResolvedValue(),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue(new Collection()),
        },
        send: jest.fn().mockResolvedValue(),
      },
    };
    await reprocessCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalledWith('Starting Reprocess... Existing scores will not be altered.');
    expect(mockedInteraction.channel.send).toBeCalled();
    expect(mockedInteraction.channel.messages.fetch).toHaveBeenCalledTimes(1);
  });

  test('Reprocess with messages', async () => {
    const mockedInteraction = {
      channelId: '1232',
      reply: jest.fn().mockResolvedValue(),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue(new Collection()),
        },
        send: jest.fn().mockResolvedValue(),
      },
    };
    const collection = new Collection();
    collection.set(1, {
      author: {
        username: 'someUser',
        tag: 'someTag',
      },
      content: 'someMessage',
    });
    collection.set(2, {
      author: {
        username: 'someUser',
        tag: 'someTag',
      },
      content: `Wordle 745 2/6*

🟨⬛🟨🟨⬛
🟩🟩🟩🟩🟩`,
    });
    mockedInteraction.channel.messages.fetch.mockResolvedValueOnce(collection);
    await reprocessCommand.execute(mockedInteraction);
    expect(mockedInteraction.reply).toBeCalledWith('Starting Reprocess... Existing scores will not be altered.');
    expect(mockedInteraction.channel.send).toBeCalled();
    expect(mockedInteraction.channel.messages.fetch).toHaveBeenCalledTimes(2);
  });
});
