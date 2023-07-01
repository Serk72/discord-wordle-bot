const { Pool, Client } = require('pg');
const config = require('config');
const DATABASE_CONFIG = config.get('postgres');
class Summary {
    constructor() {
        const pool = new Pool({
            user: DATABASE_CONFIG.user,
            host: DATABASE_CONFIG.host,
            database: DATABASE_CONFIG.database,
            password: DATABASE_CONFIG.password,
            port: DATABASE_CONFIG.port
          });
         const tablesSQL = 'CREATE TABLE IF NOT EXISTS Summary (Id serial PRIMARY KEY, Summary JSONB);'
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

    async createSummary(summary) {
        if (await this.getSummary()) {
            await this.client.query('UPDATE Summary SET Summary = $1', [summary]);
        } else {
            await this.client.query('INSERT INTO Summary(Summary) VALUES ($1)', [summary]);
        }
    }

    async getSummary() {
        let results = await this.client.query('SELECT * FROM Summary', []);
        return results?.rows?.[0];
    }

}
module.exports = { Summary };