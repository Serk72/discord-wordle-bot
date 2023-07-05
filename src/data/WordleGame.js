const {Pool} = require('pg');
const config = require('config');
const DATABASE_CONFIG = config.get('postgres');
/**
 * Data Access Layer for the WordleGame Table
 */
class WordleGame {
  pool;
  static _instance;
  /**
   * Singleton instance.
   * @return {WordleGame} the singleton instance
   */
  static getInstance() {
    if (!WordleGame._instance) {
      WordleGame._instance = new WordleGame();
    }
    return WordleGame._instance;
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
    WordleGame (
      Id serial PRIMARY KEY,
      WordleGame INT NOT NULL UNIQUE,
      Word VARCHAR (255),
      Date TIMESTAMP);`;
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
   * Gets a wordle game from the database if it exists.
   * @param {*} wordleGame game number to look up.
   * @return {*} the wordle game row if it exits or null.
   */
  async getWordleGame(wordleGame) {
    try {
      const results = await this.pool.query('SELECT * FROM WordleGame WHERE wordlegame = $1', [wordleGame]);
      return results?.rows?.[0];
    } catch (ex) {
      console.log(ex);
      throw ex;
    }
  }

  /**
   * Finds the latest game recorded in the database.
   * @return {*} the latest game recorded in the database.
   */
  async getLatestGame() {
    const results = await this.pool.query('SELECT * FROM WordleGame ORDER BY WordleGame DESC LIMIT 1', []);
    return results?.rows?.[0]?.wordlegame;
  }

  /**
   * Creates a wordle game entry.
   * @param {*} wordleGame The game number to add.
   * @param {*} timestamp The timestamp of when the game was added.
   */
  async createWordleGame(wordleGame, timestamp) {
    await this.pool.query(`INSERT INTO WordleGame(WordleGame, Date) VALUES ($1, to_timestamp($2))`, [wordleGame, timestamp / 1000]);
  }

  /**
   * Gets all wordle game dates.
   */
  async getWordleGames() {
    const results = await this.pool.query(`SELECT to_char(date, 'yyyy-MM-dd') as day FROM WordleGame`, []);
    return results.rows;
  }

  /**
   * Adds the solution to the wordle game.
   * @param {*} game wordle Game number.
   * @param {*} word solution to the wordle.
   */
  async addWord(game, word) {
    await this.pool.query(`UPDATE WordleGame SET word = $1 WHERE wordlegame = $2`, [word, game]);
  }
}
module.exports = {WordleGame};
