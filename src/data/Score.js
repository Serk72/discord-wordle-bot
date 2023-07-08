const {Pool} = require('pg');
const config = require('config');
const DATABASE_CONFIG = config.get('postgres');
/**
 * Data Access layer for the Score Table.
 */
class Score {
  pool;
  static _instance;
  /**
   * Singleton instance.
   * @return {Score} the singleton instance
   */
  static getInstance() {
    if (!Score._instance) {
      Score._instance = new Score();
    }
    return Score._instance;
  }
  /**
   * Constructor.
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
    Score (
      Id serial PRIMARY KEY,
      WordleGame INT NOT NULL,
      UserName VARCHAR (255),
      UserTag VARCHAR (255),
      WordleScore VARCHAR (255),
      Score INT, Date TIMESTAMP);`;
    this.pool.query(tablesSQL, [], (err, res) => {
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
   * Gets the users score for the given wordle game if it exists.
   * @param {*} user The user to find the score for.
   * @param {*} wordleGame The wordle game number to look for.
   * @return {*} The Score entry if it exists.
   */
  async getScore(user, wordleGame) {
    const results = await this.pool.query('SELECT * FROM Score Where UserName = $1 AND WordleGame = $2', [user, wordleGame]);
    return results?.rows?.[0];
  }

  /**
   * Recovery method which will update all Score entries based off the stored wordle string.
   */
  async setAllScores() {
    const results = await this.pool.query('SELECT * FROM Score');
    await Promise.all(results?.rows?.map((row) => {
      const subWordle = row.wordlescore.substring(row.wordlescore.indexOf(' ')+1);
      let score = Number(subWordle.substring(subWordle.indexOf(' ') + 1, subWordle.indexOf('/')));
      if (Number.isNaN(score)) {
        score = 7;
      }
      return this.pool.query('UPDATE Score SET SCORE = $1 WHERE UserName = $2 AND WordleGame = $3', [score, row.username, row.wordlegame]);
    }));
  }

  /**
   * Adds a new Score to the database.
   * @param {*} user User to store the score for.
   * @param {*} userTag User tag for the user.
   * @param {*} wordleScore Wordle String in the formate of "Wordle 742 4/6*"
   * @param {*} wordleGame Wordle game number to store.
   * @param {*} timestamp Timestamp of when the score was recorded.
   */
  async createScore(user, userTag, wordleScore, wordleGame, timestamp) {
    const subWordle = wordleScore.substring(wordleScore.indexOf(' ')+1);
    let score = Number(subWordle.substring(subWordle.indexOf(' ') + 1, subWordle.indexOf('/')));
    if (Number.isNaN(score)) {
      score = 7;
    }
    await this.pool.query('INSERT INTO Score(WordleGame, UserName, UserTag, WordleScore, Score, Date) VALUES ($1, $2, $3, $4, $5, to_timestamp($6))', [wordleGame, user, userTag, wordleScore, score, timestamp/1000]);
  }

  /**
   * Gets a list of all usernames in the Score table.
   * @return {*} list of all usernames in the Score table.
   */
  async getTotalPlayers() {
    const results = await this.pool.query('SELECT DISTINCT(UserName) FROM Score', []);
    return results?.rows?.map((row) => row.username);
  }

  /**
   * Gets all the usernames that have played the wordle game number.
   * @param {*} wordleGame wordle game number to check.
   * @return {*} list of all usernames that have played the game number.
   */
  async getPlayersForGame(wordleGame) {
    const results = await this.pool.query('SELECT DISTINCT(UserName) FROM Score WHERE wordlegame = $1', [wordleGame]);
    return results?.rows?.map((row) => row.username);
  }

  /**
   * Gets all the usernames and scores for a game.
   * @param {*} wordleGame wordle game number to check.
   * @return {*} list of all usernames and scores in order.
   */
  async getGameScores(wordleGame) {
    const results = await this.pool.query('SELECT UserName, Score FROM Score WHERE wordlegame = $1 ORDER By Score, Date', [wordleGame]);
    return results?.rows;
  }

  /**
   * Gets overall summary data for all users.
   * @return {*} overall summary data for all users.
   */
  async getPlayerSummaries() {
    const results = await this.pool.query(`
    SELECT 
      COUNT(*) as games, 
      SUM(Score) as totalscore, 
      ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average,  
      username, 
      (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost 
    FROM SCORE 
    GROUP BY  Username 
    ORDER BY Average`);
    return results?.rows;
  }

  /**
   * Gets last 7 day summary for all users.
   * @return {*} last 7 day summary for all users.
   */
  async getLast7DaysSummaries() {
    const results = await this.pool.query(`
    SELECT 
      COUNT(*) as games, 
      SUM(Score) as totalscore, 
      ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average, 
      username, 
      (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost 
    FROM SCORE 
    WHERE 
      Date > now() - interval '7 days'
    GROUP BY Username
    ORDER BY Average`);
    return results?.rows;
  }

  /**
   * Gets last month summaries for all users.
   * @return {*} last month summaries for all users.
   */
  async getLastMonthSummaries() {
    const results = await this.pool.query(`
    SELECT 
      COUNT(*) as games, 
      SUM(Score) as totalscore, 
      ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average, 
      username,
      (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost, 
      to_Char((now() - interval '1 month')::date, 'Month') AS lastmonth 
    FROM SCORE 
    WHERE
      EXTRACT('MONTH' FROM Date) = EXTRACT('MONTH' FROM Now() - interval '1 month')
    GROUP BY UserName
    ORDER BY Average`);
    return results?.rows;
  }
}

module.exports = {Score};
