import Database from "better-sqlite3";

const db = new Database("leave_management.db");

try {
  const users = db.prepare("SELECT count(*) as count FROM users").get();
  const departments = db.prepare("SELECT count(*) as count FROM departments").get();
  const leaves = db.prepare("SELECT count(*) as count FROM leaves").get();

  console.log("Database Stats:");
  console.log(`Users: ${users.count}`);
  console.log(`Departments: ${departments.count}`);
  console.log(`Leaves: ${leaves.count}`);

  console.log("\nUsers List:");
  const usersList = db.prepare("SELECT id, email, name, role, department_id FROM users").all();
  console.log(JSON.stringify(usersList, null, 2));

  console.log("\nDepartments List:");
  const departmentsList = db.prepare("SELECT * FROM departments").all();
  console.log(JSON.stringify(departmentsList, null, 2));

} catch (err) {
  console.error("Error querying database:", err.message);
}
