const db = require('../src/config/database');

async function updateFare() {
  try {
    await db.query("UPDATE fare_configurations SET minimum_fare = 25.00, base_fare = 25.00 WHERE vehicle_type = 'BIKE'");
    await db.query("UPDATE fare_configurations SET minimum_fare = 25.00 WHERE minimum_fare < 25.00");
    const configs = await db.query("SELECT * FROM fare_configurations");
    console.log("Current Fare Configurations in DB:", configs);
    process.exit(0);
  } catch (err) {
    console.error("Error updating fare:", err);
    process.exit(1);
  }
}

updateFare();
