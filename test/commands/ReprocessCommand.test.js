const ReprocessCommand = require('../../src/commands/ReprocessCommand');
const {Collection} = require('discord.js');

jest.spyOn(console, 'error').mockImplementation(() => {});
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

  test('Reprocess with no messages', async () => {
    const mockedInteraction = {
      channelId: '1232',
      deferReply: jest.fn().mockResolvedValue(),
      followUp: jest.fn().mockResolvedValue(),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue(new Collection()),
        },
      },
    };
    await reprocessCommand.execute(mockedInteraction);
    expect(mockedInteraction.deferReply).toBeCalledWith({ephemeral: true});
    expect(mockedInteraction.followUp).toHaveBeenCalledTimes(2);
    expect(mockedInteraction.channel.messages.fetch).toHaveBeenCalledTimes(1);
  });

  test('Reprocess with messages', async () => {
    const mockedInteraction = {
      channelId: '1232',
      deferReply: jest.fn().mockResolvedValue(),
      followUp: jest.fn().mockResolvedValue(),
      channel: {
        messages: {
          fetch: jest.fn().mockResolvedValue(new Collection()),
        },
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
    expect(mockedInteraction.deferReply).toBeCalledWith({ephemeral: true});
    expect(mockedInteraction.followUp).toHaveBeenCalledTimes(2);
    expect(mockedInteraction.channel.messages.fetch).toHaveBeenCalledTimes(2);
  });
  test('test invalid command', async () => {
    let error = false;
    try {
      await reprocessCommand.execute(null, null);
    } catch (err) {
      error = true;
    }
    expect(error).toBe(true);
  });
});
