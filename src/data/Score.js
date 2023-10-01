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
      Score INT,
      GuildId VARCHAR (255),
      ChannelId VARCHAR (255),
      Date TIMESTAMP);`;
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
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} The Score entry if it exists.
   */
  async getScore(user, wordleGame, guildId, channelId) {
    const results = await this.pool.query(`
    SELECT * FROM 
    Score Where
     UserName = $1
     AND WordleGame = $2
     AND GuildId = $3
     AND ChannelId = $4`, [user, wordleGame, guildId, channelId]);
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
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   */
  async createScore(user, userTag, wordleScore, wordleGame, timestamp, guildId, channelId) {
    const subWordle = wordleScore.substring(wordleScore.indexOf(' ')+1);
    let score = Number(subWordle.substring(subWordle.indexOf(' ') + 1, subWordle.indexOf('/')));
    if (Number.isNaN(score)) {
      score = 7;
    }
    await this.pool.query(`
    INSERT INTO 
    Score(WordleGame, UserName, UserTag, WordleScore, Score, Date, GuildId, ChannelId)
     VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7, $8)`, [wordleGame, user, userTag, wordleScore, score, timestamp/1000, guildId, channelId]);
  }

  /**
   * Gets a list of all usernames in the Score table.
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} list of all usernames in the Score table.
   */
  async getTotalPlayers(guildId, channelId) {
    const results = await this.pool.query('SELECT DISTINCT(UserName) FROM Score WHERE GuildId = $1 AND ChannelId = $2', [guildId, channelId]);
    return results?.rows?.map((row) => row.username);
  }

  /**
   * Gets all the usernames that have played the wordle game number.
   * @param {*} wordleGame wordle game number to check.
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} list of all usernames that have played the game number.
   */
  async getPlayersForGame(wordleGame, guildId, channelId) {
    const results = await this.pool.query('SELECT DISTINCT(UserName) FROM Score WHERE wordlegame = $1 AND GuildId = $2 AND ChannelId = $3', [wordleGame, guildId, channelId]);
    return results?.rows?.map((row) => row.username);
  }

  /**
   * Gets all the usernames and scores for a game.
   * @param {*} wordleGame wordle game number to check.
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} list of all usernames and scores in order.
   */
  async getGameScores(wordleGame, guildId, channelId) {
    const results = await this.pool.query('SELECT UserName, Score FROM Score WHERE wordlegame = $1 AND GuildId = $2 AND ChannelId = $3 ORDER By Score, Date', [wordleGame, guildId, channelId]);
    return results?.rows;
  }

  /**
   * Gets all scores for a user with the word that was guessed on.
   * @param {*} username The username to find scores for
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} list of objects containing the word guessed and number of guesses.
   */
  async getPlayerScores(username, guildId, channelId) {
    const result = await this.pool.query('SELECT s.score, g.word FROM Score s JOIN WordleGame g ON s.wordleGame = g.wordleGame Where s.username = $1 AND GuildId = $2 AND ChannelId = $3', [username, guildId, channelId]);
    return result?.rows;
  }

  /**
   * Gets overall summary data for all users.
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} overall summary data for all users.
   */
  async getPlayerSummaries(guildId, channelId) {
    const results = await this.pool.query(`
    SELECT 
      COUNT(*) as games, 
      SUM(Score) as totalscore, 
      ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average,  
      username, 
      (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost 
    FROM SCORE 
    WHERE
      GuildId = $1 AND ChannelId = $2
    GROUP BY  Username 
    ORDER BY Average`, [guildId, channelId]);
    return results?.rows;
  }

  /**
   * Gets last 7 day summary for all users.
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} last 7 day summary for all users.
   */
  async getLast7DaysSummaries(guildId, channelId) {
    const results = await this.pool.query(`
    SELECT 
      COUNT(*) as games, 
      SUM(Score) as totalscore, 
      ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average, 
      username, 
      (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost 
    FROM SCORE 
    WHERE 
      Date > now() - interval '7 days' AND GuildId = $1 AND ChannelId = $2
    GROUP BY Username
    ORDER BY Average`, [guildId, channelId]);
    return results?.rows;
  }

  /**
   * Gets last month summaries for all users.
   * @param {*} guildId Guild Id for the server the score was posted too.
   * @param {*} channelId Channel id the score was posted too.
   * @return {*} last month summaries for all users.
   */
  async getLastMonthSummaries(guildId, channelId) {
    const results = await this.pool.query(`
    SELECT 
      COUNT(*) as games, 
      SUM(Score) as totalscore, 
      ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average, 
      username,
      (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost, 
      to_Char((now() - interval '1 month')::date, 'Month') AS lastmonth 
    FROM SCORE s JOIN WORDLEGAME w ON w.wordlegame = s.wordlegame
    WHERE
      EXTRACT('MONTH' FROM w.Date) = EXTRACT('MONTH' FROM Now() - interval '1 month') AND GuildId = $1 AND ChannelId = $2
    GROUP BY UserName
    ORDER BY Average`, [guildId, channelId]);
    return results?.rows;
  }
}

module.exports = {Score};
