const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.development);

async function runMigrations() {
  try {
    await db.migrate.latest();
    console.log('Migrations ran successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await db.destroy();
  }
}

runMigrations();
