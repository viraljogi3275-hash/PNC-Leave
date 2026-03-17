import Database from "better-sqlite3";

const db = new Database("leave_management.db");

try {
  const result = db.prepare("INSERT INTO departments (name, location) VALUES (?, ?)").run("Test Dept", "Test Location");
  console.log("Inserted department with ID:", result.lastInsertRowid);
  
  const depts = db.prepare("SELECT * FROM departments").all();
  console.log("Departments in DB:", JSON.stringify(depts, null, 2));
} catch (err) {
  console.error("Error:", err.message);
}
