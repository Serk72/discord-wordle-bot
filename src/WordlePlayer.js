const config = require('config');
const {WordleGame} = require('./data/WordleGame');
const {WordleWord} = require('./data/WordleWord');

const INCORRECT = '⬛';
const CONTAINS = '🟨';
const CORRECT = '🟩';
/**
 * Plays Wordle.
 */
class WordlePlayer {
  /**
     * Constuctor
     */
  constructor() {
    this.wordleGame = WordleGame.getInstance();
    this.wordleWord = WordleWord.getInstance();
  }

  /**
   * Plays the given wordle Game.
   * @param {*} wordleGameNumber the game number to play
   * @return {*} Share string for the wordle game or false if it failed to play.
   */
  async playGame(wordleGameNumber) {
    console.log(`Playing Wordle ${wordleGameNumber}.`);
    const gameInfo = await this.wordleGame.getWordleGame(wordleGameNumber);
    if (!gameInfo?.word || gameInfo.word.trim() === '') {
      return false;
    }
    const solution = gameInfo.word;
    console.log('Game Solution: ' + solution);
    let possibleLetters = [
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
    ];
    const containingLetters = [];
    let playedGame = '';
    let score = 1;
    const firstWord = config.get('wordleFirstWord');
    for (let i = 1; i <=6; i++) {
      let guess;
      if (i === 1 && firstWord) {
        guess = firstWord;
      } else {
        guess = await this.wordleWord.getRandomWord(containingLetters, possibleLetters[0], possibleLetters[1], possibleLetters[2], possibleLetters[3], possibleLetters[4], i >= 6, wordleGameNumber);
      }

      if (!guess) {
        console.log('No Guesses left.');
        score = 7;
        break;
      }
      const round = await this.playRound(solution, guess);
      playedGame += round.join('') + '\n';
      if (round.includes(INCORRECT) || round.includes(CONTAINS)) {
        round.forEach((evaluation, index) => {
          if (evaluation === CORRECT) {
            possibleLetters[index] = [guess[index]];
          } else if (evaluation === CONTAINS) {
            possibleLetters[index] = possibleLetters[index].filter((letter) => letter !== guess[index]);
            containingLetters.push(guess[index]);
          } else if (evaluation === INCORRECT) {
            possibleLetters = possibleLetters.map((row) => {
              return row.filter((letter) => letter !== guess[index]);
            });
          }
        });
        score++;
      } else {
        break;
      }
    }
    return `Wordle ${wordleGameNumber.toLocaleString()} ${score >= 7 ? 'X': score}/6*

${playedGame}`;
  }

  /**
   * Evaluates the guess for the solution
   * @param {*} solution the solution to the wordle game
   * @param {*} guess guess for the round
   * @return {*} emoji evaluation of the round.
   */
  async playRound(solution, guess) {
    if (!guess) {
      console.log('No Guesses left.');
      return [INCORRECT, INCORRECT, INCORRECT, INCORRECT, INCORRECT];
    }
    console.log(guess);
    const round =[];
    for (let i = 0; i < 5; i++) {
      if (guess[i] === solution[i]) {
        round.push(CORRECT);
      } else if (solution.includes(guess[i])) {
        round.push(CONTAINS);
      } else {
        round.push(INCORRECT);
      }
    }
    return round;
  }
}

module.exports = {WordlePlayer};
