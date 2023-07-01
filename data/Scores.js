const { Pool, Client } = require('pg');
const config = require('config');
const DATABASE_CONFIG = config.get('postgres');
class Score {
    constructor() {
        const pool = new Pool({
            user: DATABASE_CONFIG.user,
            host: DATABASE_CONFIG.host,
            database: DATABASE_CONFIG.database,
            password: DATABASE_CONFIG.password,
            port: DATABASE_CONFIG.port
          });
         const tablesSQL = 'CREATE TABLE IF NOT EXISTS Score (Id serial PRIMARY KEY, WordleGame INT NOT NULL, UserName VARCHAR (255), UserTag VARCHAR (255), WordleScore VARCHAR (255), Score INT, Date TIMESTAMP);'
         pool.query(tablesSQL, (err, res) => {
            if (err) {
              console.error(err);
              return;
            }
          });
    }

    async connect() {
        if (!this.client) {
            this.client = new Client({
                connectionString: DATABASE_CONFIG.connectionString
              });
            await this.client.connect();
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.end();
            this.client = null;
        } 
    }

    async getScore(user, wordleGame) {
        let results = await this.client.query('SELECT * FROM Score Where UserName = $1 AND WordleGame = $2', [user, wordleGame]);
        return results?.rows?.[0];
    }

    async setAllScores() {
        let results = await this.client.query('SELECT * FROM Score');
        await Promise.all(results?.rows?.map((row) => {
            let subWordle = row.wordlescore.substring(row.wordlescore.indexOf(' ')+1);
            let score = Number(subWordle.substring(subWordle.indexOf(' ') + 1, subWordle.indexOf('/')));
            if (Number.isNaN(score)) {
                score = 7;
            }
            return this.client.query('UPDATE Score SET SCORE = $1 WHERE UserName = $2 AND WordleGame = $3', [score, row.username, row.wordlegame]);
        }))
    }

    async createScore(user, userTag, wordleScore, wordleGame, timestamp) {
        let subWordle = wordleScore.substring(wordleScore.indexOf(' ')+1);
        let score = Number(subWordle.substring(subWordle.indexOf(' ') + 1, subWordle.indexOf('/')));
        if (Number.isNaN(score)) {
            score = 7;
        }
        await this.client.query('INSERT INTO Score(WordleGame, UserName, UserTag, WordleScore, Score, Date) VALUES ($1, $2, $3, $4, $5, to_timestamp($6))', [wordleGame, user, userTag, wordleScore,score, timestamp/1000]);
    }

    async getTotalPlayers() {
        let results = await this.client.query('SELECT DISTINCT(UserName) FROM Score', []);
        return results?.rows?.map(row => row.username);
    }

    async getPlayersForGame(wordleGame) {
        let results = await this.client.query('SELECT DISTINCT(UserName) FROM Score WHERE wordlegame = $1', [wordleGame]);
        return results?.rows?.map(row => row.username);
    }

    async getPlayerSummaries() {
        let results = await this.client.query('SELECT COUNT(*) as games, SUM(Score) as totalscore, ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average,  username, (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost FROM SCORE GROUP By  Username ORDER BY Average');
        return results?.rows;
    }

    async getLast7DaysSummaries() {
      let results = await this.client.query("SELECT COUNT(*) as games, SUM(Score) as totalscore, ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average, username, (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost FROM SCORE WHERE Date > now() - interval '7 days' GROUP By Username ORDER BY Average");
      return results?.rows;
    }

    async getLastMonthSummaries() {
        let results = await this.client.query("SELECT COUNT(*) as games, SUM(Score) as totalscore, ROUND(CAST(SUM(Score)::float/COUNT(*)::float as numeric), 2) AS Average, username, (COUNT(CASE WHEN score >= 7 THEN 1 END)) as gameslost, to_Char((now() - interval '1 month')::date, 'Month') AS lastmonth FROM SCORE WHERE  EXTRACT('MONTH' FROM Date) = EXTRACT('MONTH' FROM Now() - interval '1 month') GROUP BY UserNAme ORDER BY Average");
        return results?.rows;
    }
}

module.exports = { Score };