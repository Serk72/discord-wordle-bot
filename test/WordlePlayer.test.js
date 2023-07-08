const {WordlePlayer} = require('../src/WordlePlayer');
const {WordleWord} = require('../src/data/WordleWord');
const {WordleGame} = require('../src/data/WordleGame');
const config = require('config');

jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.mock('../src/data/WordleWord', () => {
  return ({
    WordleWord: {
      getInstance: jest.fn().mockReturnValue({
        getRandomWord: jest.fn().mockResolvedValue('swear'),
      }),
    },
  });
});
jest.mock('../src/data/WordleGame', () => {
  return ({
    WordleGame: {
      getInstance: jest.fn().mockReturnValue({
        getWordleGame: jest.fn().mockResolvedValue({word: 'slate'}),
      }),
    },
  });
});
jest.mock('config');
config.get.mockReturnValue(false);
describe('WordlePlayer Tests', () => {
  const wordlePlayer = new WordlePlayer();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('lost game.', async () => {
    const played = await wordlePlayer.playGame(1234);
    expect(played).toEqual(`Wordle 1234 X/6*

🟩⬛🟨🟨⬛
🟩⬛🟨🟨⬛
🟩⬛🟨🟨⬛
🟩⬛🟨🟨⬛
🟩⬛🟨🟨⬛
🟩⬛🟨🟨⬛
`);
  });

  test('no game.', async () => {
    WordleGame.getInstance().getWordleGame.mockResolvedValueOnce(null);
    const played = await wordlePlayer.playGame(1234);
    expect(played).toEqual(false);
  });

  test('Win in one', async () => {
    WordleWord.getInstance().getRandomWord.mockResolvedValueOnce('slate');
    const played = await wordlePlayer.playGame(1234);
    expect(played).toEqual(`Wordle 1234 1/6*

🟩🟩🟩🟩🟩
`);
  });

  test('No guesses', async () => {
    WordleWord.getInstance().getRandomWord.mockResolvedValueOnce(null);
    const played = await wordlePlayer.playGame(1234);
    expect(played).toEqual(`Wordle 1234 X/6*

`);
  });

  test('configured first word', async () => {
    config.get.mockReturnValueOnce('slate');
    const played = await wordlePlayer.playGame(1234);
    expect(played).toEqual(`Wordle 1234 1/6*

🟩🟩🟩🟩🟩
`);
  });

  test('played with no guess', async () => {
    const played = await wordlePlayer.playRound();
    expect(played).toEqual(['⬛', '⬛', '⬛', '⬛', '⬛']);
  });
});
