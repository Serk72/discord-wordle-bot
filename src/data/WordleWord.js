const {Pool} = require('pg');
const config = require('config');
const DATABASE_CONFIG = config.get('postgres');
/**
 * Data Access Layer for the WordleWord Table
 */
class WordleWord {
  pool;
  static _instance;
  /**
   * Singleton instance.
   * @return {WordleWord} the singleton instance
   */
  static getInstance() {
    if (!WordleWord._instance) {
      WordleWord._instance = new WordleWord();
    }
    return WordleWord._instance;
  }
  /**
   * Constructor
   */
  constructor() {
    this.pool = new Pool({
      user: DATABASE_CONFIG.user,
      host: DATABASE_CONFIG.host,
      database: DATABASE_CONFIG.database,
      password: DATABASE_CONFIG.password,
      port: DATABASE_CONFIG.port,
    });
    const tablesSQL = `CREATE TABLE IF NOT EXISTS 
    WordleWord (
      Id serial PRIMARY KEY,
      Word VARCHAR (255) UNIQUE);`;
    this.pool.query(tablesSQL, (err, res) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  /**
   * Add the word.
   * @param {*} word solution to wordle.
   */
  async addWord(word) {
    await this.pool.query(`INSERT INTO WordleWord (Word) VALUES ($1)`, [word]);
  }

  /**
   * Gets a random word from the database with the possible charaters
   * @param {*} containingLetters letters that must be contained in the word.
   * @param {*} first array of characters in the first position
   * @param {*} second array of characters in the second position
   * @param {*} third array of characters in the third position
   * @param {*} fourth array of characters in the fourth position
   * @param {*} fifth array of characters in the fifth position
   * @param {*} isLastGuess boolean indicating if this is the last guess in the game, meaning duplicate chars should no longer be checked for.
   * @param {*} wordleGameNumber the wordle game number being played.
   */
  async getRandomWord(containingLetters, first, second, third, fourth, fifth, isLastGuess, wordleGameNumber) {
    const regex = `^[${first.join('')}][${second.join('')}][${third.join('')}][${fourth.join('')}][${fifth.join('')}]$`;
    let result;
    if (!isLastGuess) {
      result = await this.pool.query(`
    SELECT Word from WordleWord Where Word ~ $1 
    ${containingLetters.map((letter) => `AND Word ~ '${letter}'`).join(' ')}
    AND Word !~ '(.).*\\1'
    AND Word Not IN (SELECT Word FROM WordleGame WHERE WordleGame != $2)
    ORDER BY random()`, [regex, wordleGameNumber]);
    }
    if (!result?.rows?.[0]?.word) {
      result = await this.pool.query(`
      SELECT Word from WordleWord Where Word ~ $1 
      ${containingLetters.map((letter) => `AND Word ~ '${letter}'`).join(' ')}
      ORDER BY random()`, [regex]);
    }
    return result?.rows?.[0]?.word;
  }
}
module.exports = {WordleWord};
