import Database from "better-sqlite3";

const db = new Database("leave_management.db");

try {
  const supervisors = db.prepare("SELECT * FROM user_supervisors").all();
  console.log("User Supervisors:", JSON.stringify(supervisors, null, 2));
} catch (err) {
  console.error("Error:", err.message);
}
