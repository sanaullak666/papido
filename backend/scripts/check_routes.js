const db = require('../src/config/database');

async function check() {
  await db.initializeDatabase();
  const routes = await db.query('SELECT * FROM route_fares');
  console.log('CURRENT_ROUTES_IN_DB:');
  console.log(JSON.stringify(routes, null, 2));
  process.exit(0);
}
check();
