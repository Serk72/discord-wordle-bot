const { Pool, Client } = require('pg');
const config = require('config');
const DATABASE_CONFIG = config.get('postgres');
class WordleGame {
    client;
    constructor() {
        const pool = new Pool({
            user: DATABASE_CONFIG.user,
            host: DATABASE_CONFIG.host,
            database: DATABASE_CONFIG.database,
            password: DATABASE_CONFIG.password,
            port: DATABASE_CONFIG.port
          });
         const tablesSQL = 'CREATE TABLE IF NOT EXISTS WordleGame (Id serial PRIMARY KEY, WordleGame INT NOT NULL UNIQUE, Word VARCHAR (255), Date TIMESTAMP);'
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

    async getWordleGame(wordleGame) {
        try {
            let results = await this.client.query('SELECT * FROM WordleGame WHERE wordlegame = $1', [wordleGame])
            return results?.rows?.[0];
        } catch (ex) {
            console.log(ex);
            throw ex;
        }
        
    }

    async getLatestGame() {
        let results = await this.client.query('SELECT * FROM WordleGame ORDER BY WordleGame DESC LIMIT 1', []);
        return results?.rows?.[0]?.wordlegame;
    }

    async createWordleGame(wordleGame, timestamp) {
        const res = await this.client.query(`INSERT INTO WordleGame(WordleGame, Date) VALUES ($1, to_timestamp($2))`, [wordleGame, timestamp / 1000]);
    }
}
module.exports = { WordleGame };
