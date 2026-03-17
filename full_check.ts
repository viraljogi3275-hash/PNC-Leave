import Database from "better-sqlite3";

const db = new Database("leave_management.db");

console.log("--- ALL USERS ---");
const users = db.prepare("SELECT * FROM users").all();
console.log(JSON.stringify(users, null, 2));

console.log("--- ALL DEPARTMENTS ---");
const depts = db.prepare("SELECT * FROM departments").all();
console.log(JSON.stringify(depts, null, 2));

console.log("--- ALL LEAVES ---");
const leaves = db.prepare("SELECT * FROM leaves").all();
console.log(JSON.stringify(leaves, null, 2));
