import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("leave_management.db");

// CRITICAL: Do NOT add any code that drops tables or deletes all records on startup.
// The user wants to persist their data across restarts.

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    supervisor_id INTEGER,
    location TEXT,
    FOREIGN KEY(supervisor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sub_departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    department_id INTEGER,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    password TEXT,
    role TEXT CHECK(role IN ('sender', 'approver', 'admin', 'supervisor', 'manager', 'planner', 'quality')) DEFAULT 'sender',
    supervisor_id INTEGER,
    department_id INTEGER,
    sub_department_id INTEGER,
    birth_date TEXT,
    manager_id INTEGER,
    planner_id INTEGER,
    quality_id INTEGER,
    FOREIGN KEY(supervisor_id) REFERENCES users(id),
    FOREIGN KEY(department_id) REFERENCES departments(id),
    FOREIGN KEY(sub_department_id) REFERENCES sub_departments(id),
    FOREIGN KEY(manager_id) REFERENCES users(id),
    FOREIGN KEY(planner_id) REFERENCES users(id),
    FOREIGN KEY(quality_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    from_time TEXT,
    to_time TEXT,
    type TEXT CHECK(type IN ('half', 'full', 'hours', 'days')),
    hours REAL,
    days INTEGER,
    reason_type TEXT CHECK(reason_type IN ('Medical', 'Parenthood', 'Others')),
    reason TEXT,
    other_reason TEXT,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_supervisors (
    user_id INTEGER,
    supervisor_id INTEGER,
    PRIMARY KEY (user_id, supervisor_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
  );
`);

// Migrate existing supervisor_id to user_supervisors table
try {
  const usersWithSupervisor = db.prepare("SELECT id, supervisor_id FROM users WHERE supervisor_id IS NOT NULL").all();
  for (const user of usersWithSupervisor as any[]) {
    db.prepare("INSERT OR IGNORE INTO user_supervisors (user_id, supervisor_id) VALUES (?, ?)").run(user.id, user.supervisor_id);
  }
} catch (e) {
  console.error("Migration error:", e);
}

// Add new columns if they don't exist (for existing databases)
const migrations = [
  "ALTER TABLE users ADD COLUMN sub_department_id INTEGER",
  "ALTER TABLE users ADD COLUMN birth_date TEXT",
  "ALTER TABLE users ADD COLUMN manager_id INTEGER",
  "ALTER TABLE users ADD COLUMN planner_id INTEGER",
  "ALTER TABLE users ADD COLUMN quality_id INTEGER",
  "ALTER TABLE leaves ADD COLUMN from_time TEXT",
  "ALTER TABLE leaves ADD COLUMN to_time TEXT",
  "ALTER TABLE leaves ADD COLUMN days INTEGER",
  "ALTER TABLE leaves ADD COLUMN reason_type TEXT",
  "ALTER TABLE leaves ADD COLUMN other_reason TEXT"
];

for (const migration of migrations) {
  try {
    db.prepare(migration).run();
  } catch (e) {
    // Column likely already exists
  }
}

// Note: Changing CHECK constraints in SQLite is hard. 
// For roles, we'll just assume the app handles it or the user recreates the DB if needed for strict enforcement.
// But we can try to update the type check if possible, though SQLite ALTER TABLE is limited.

// Seed initial admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const defaultPassword = bcrypt.hashSync("123", 10);
  db.prepare("INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)").run(
    "admin@pnc.com",
    "System Admin",
    "admin",
    defaultPassword
  );
  db.prepare("INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)").run(
    "sender@pnc.com",
    "John Employee",
    "sender",
    defaultPassword
  );
  db.prepare("INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)").run(
    "approver@pnc.com",
    "Sarah Manager",
    "approver",
    defaultPassword
  );
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();
    console.log(`Login attempt for: "${trimmedEmail}"`);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(trimmedEmail);
    
    if (user) {
      const passwordMatch = bcrypt.compareSync(password || "", user.password || "");
      if (passwordMatch) {
        console.log(`Login successful for: ${trimmedEmail}`);
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        console.log(`Login failed (wrong password) for: ${trimmedEmail}`);
        res.status(401).json({ error: "Invalid password" });
      }
    } else {
      console.log(`Login failed (user not found) for: ${trimmedEmail}`);
      res.status(401).json({ error: "User not found" });
    }
  });

  app.get("/api/users", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const users = db.prepare("SELECT id, email, name, role, supervisor_id, department_id, sub_department_id, birth_date, manager_id, planner_id, quality_id FROM users ORDER BY id DESC").all();
    console.log(`Fetching users: found ${users.length} users`);
    const usersWithSupervisors = users.map(user => {
      const supervisors = db.prepare("SELECT supervisor_id FROM user_supervisors WHERE user_id = ?").all(user.id);
      return {
        ...user,
        supervisor_ids: supervisors.map(s => s.supervisor_id)
      };
    });
    res.json(usersWithSupervisors);
  });

  app.post("/api/users", (req, res) => {
    const { email, name, role, supervisor_ids, password, department_id, sub_department_id, birth_date, manager_id, planner_id, quality_id } = req.body;
    const trimmedEmail = email?.trim();
    const hashedPassword = bcrypt.hashSync(password || "123", 10);
    console.log(`Creating user: ${trimmedEmail} with role ${role}`);
    try {
      const result = db.prepare(`
        INSERT INTO users (email, name, role, password, department_id, sub_department_id, birth_date, manager_id, planner_id, quality_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(trimmedEmail, name, role, hashedPassword, department_id || null, sub_department_id || null, birth_date || null, manager_id || null, planner_id || null, quality_id || null);
      const userId = result.lastInsertRowid;
      console.log(`User created successfully with ID: ${userId}`);
      
      if (Array.isArray(supervisor_ids)) {
        const insertSupervisor = db.prepare("INSERT INTO user_supervisors (user_id, supervisor_id) VALUES (?, ?)");
        for (const sId of supervisor_ids) {
          insertSupervisor.run(userId, sId);
        }
      }
      
      res.json({ success: true, id: userId });
    } catch (err: any) {
      console.error(`Error creating user: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/users/role", (req, res) => {
    const { userId, role } = req.body;
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
    res.json({ success: true });
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { email, name, role, supervisor_ids, password, department_id, sub_department_id, birth_date, manager_id, planner_id, quality_id } = req.body;
    const trimmedEmail = email?.trim();
    
    try {
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare(`
          UPDATE users 
          SET email = ?, name = ?, role = ?, password = ?, department_id = ?, sub_department_id = ?, birth_date = ?, manager_id = ?, planner_id = ?, quality_id = ? 
          WHERE id = ?
        `).run(trimmedEmail, name, role, hashedPassword, department_id || null, sub_department_id || null, birth_date || null, manager_id || null, planner_id || null, quality_id || null, id);
      } else {
        db.prepare(`
          UPDATE users 
          SET email = ?, name = ?, role = ?, department_id = ?, sub_department_id = ?, birth_date = ?, manager_id = ?, planner_id = ?, quality_id = ? 
          WHERE id = ?
        `).run(trimmedEmail, name, role, department_id || null, sub_department_id || null, birth_date || null, manager_id || null, planner_id || null, quality_id || null, id);
      }

      // Update supervisors
      db.prepare("DELETE FROM user_supervisors WHERE user_id = ?").run(id);
      if (Array.isArray(supervisor_ids)) {
        const insertSupervisor = db.prepare("INSERT INTO user_supervisors (user_id, supervisor_id) VALUES (?, ?)");
        for (const sId of supervisor_ids) {
          insertSupervisor.run(id, sId);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error(`Error updating user: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Sub-Department Routes
  app.get("/api/sub-departments", (req, res) => {
    const subDepartments = db.prepare("SELECT * FROM sub_departments").all();
    res.json(subDepartments);
  });

  app.post("/api/sub-departments", (req, res) => {
    const { name, department_id } = req.body;
    try {
      const result = db.prepare("INSERT INTO sub_departments (name, department_id) VALUES (?, ?)").run(name, department_id);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/sub-departments/:id", (req, res) => {
    const { id } = req.params;
    const { name, department_id } = req.body;
    try {
      db.prepare("UPDATE sub_departments SET name = ?, department_id = ? WHERE id = ?")
        .run(name, department_id, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/sub-departments/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM sub_departments WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Department Routes
  app.get("/api/departments", (req, res) => {
    const departments = db.prepare("SELECT * FROM departments").all();
    res.json(departments);
  });

  app.post("/api/departments", (req, res) => {
    const { name, supervisor_id, location } = req.body;
    try {
      const result = db.prepare("INSERT INTO departments (name, supervisor_id, location) VALUES (?, ?, ?)").run(name, supervisor_id || null, location || null);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/departments/:id", (req, res) => {
    const { id } = req.params;
    const { name, supervisor_id, location } = req.body;
    try {
      db.prepare("UPDATE departments SET name = ?, supervisor_id = ?, location = ? WHERE id = ?")
        .run(name, supervisor_id || null, location || null, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/departments/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM departments WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/leaves", (req, res) => {
    const { userId, role } = req.query;
    let leaves;
    const managementRoles = ['admin', 'approver', 'supervisor', 'manager', 'planner', 'quality'];
    
    if (role === 'admin' || role === 'approver') {
      // Admins and Approvers see all leaves for full history
      leaves = db.prepare(`
        SELECT l.*, u.name as sender_name, d.name as department_name
        FROM leaves l 
        JOIN users u ON l.sender_id = u.id 
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY l.created_at DESC
      `).all();
    } else if (managementRoles.includes(role as string)) {
      // Management roles see their own leaves, their subordinates' leaves, and department peers
      const user = db.prepare("SELECT department_id FROM users WHERE id = ?").get(userId);
      if (user && user.department_id) {
        leaves = db.prepare(`
          SELECT l.*, u.name as sender_name, d.name as department_name
          FROM leaves l 
          JOIN users u ON l.sender_id = u.id 
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.department_id = ? 
             OR EXISTS (SELECT 1 FROM user_supervisors us WHERE us.user_id = u.id AND us.supervisor_id = ?) 
             OR u.manager_id = ?
             OR u.planner_id = ?
             OR u.quality_id = ?
             OR l.sender_id = ?
          ORDER BY l.created_at DESC
        `).all(user.department_id, userId, userId, userId, userId, userId);
      } else {
        leaves = db.prepare(`
          SELECT l.*, u.name as sender_name, d.name as department_name
          FROM leaves l 
          JOIN users u ON l.sender_id = u.id 
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE EXISTS (SELECT 1 FROM user_supervisors us WHERE us.user_id = u.id AND us.supervisor_id = ?) 
             OR u.manager_id = ?
             OR u.planner_id = ?
             OR u.quality_id = ?
             OR l.sender_id = ?
          ORDER BY l.created_at DESC
        `).all(userId, userId, userId, userId, userId);
      }
    } else {
      // Employees see leaves of everyone in their department to help with planning
      const user = db.prepare("SELECT department_id FROM users WHERE id = ?").get(userId);
      if (user && user.department_id) {
        leaves = db.prepare(`
          SELECT l.*, u.name as sender_name, d.name as department_name
          FROM leaves l 
          JOIN users u ON l.sender_id = u.id 
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.department_id = ? OR l.sender_id = ?
          ORDER BY l.created_at DESC
        `).all(user.department_id, userId);
      } else {
        leaves = db.prepare(`
          SELECT l.*, u.name as sender_name, d.name as department_name
          FROM leaves l 
          JOIN users u ON l.sender_id = u.id 
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE l.sender_id = ? 
          ORDER BY l.created_at DESC
        `).all(userId);
      }
    }
    res.json(leaves);
  });

  app.post("/api/leaves", (req, res) => {
    const { sender_id, start_date, end_date, from_time, to_time, type, hours, days, reason_type, reason, other_reason } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO leaves (sender_id, start_date, end_date, from_time, to_time, type, hours, days, reason_type, reason, other_reason) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sender_id, start_date, end_date, from_time || null, to_time || null, type, hours || null, days || null, reason_type, reason, other_reason || null);
      
      const leaveId = result.lastInsertRowid;
      
      // Notify approvers and supervisors/managers
      const sender = db.prepare("SELECT name, department_id, manager_id, planner_id, quality_id FROM users WHERE id = ?").get(sender_id);
      
      // Find all supervisors
      const supervisors = db.prepare("SELECT supervisor_id FROM user_supervisors WHERE user_id = ?").all(sender_id);
      const approvers = db.prepare("SELECT id FROM users WHERE role = 'approver'").all();
      
      const notifyIds = new Set([
        ...supervisors.map(s => s.supervisor_id),
        ...approvers.map(a => a.id),
        sender.manager_id,
        sender.planner_id,
        sender.quality_id
      ].filter(id => id && id !== sender_id));

      const insertNotif = db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)");
      for (const uId of notifyIds) {
        const msg = `New leave request from ${sender.name}`;
        insertNotif.run(uId, msg);
        io.to(`user_${uId}`).emit("notification", { message: msg });
      }

      res.json({ success: true, id: leaveId });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/leaves/status", (req, res) => {
    const { leaveId, status, rejection_reason, approverId } = req.body;
    db.prepare("UPDATE leaves SET status = ?, rejection_reason = ? WHERE id = ?").run(status, rejection_reason, leaveId);

    const leave = db.prepare("SELECT * FROM leaves WHERE id = ?").get(leaveId);
    const sender = db.prepare("SELECT * FROM users WHERE id = ?").get(leave.sender_id);
    const approver = db.prepare("SELECT name FROM users WHERE id = ?").get(approverId);

    const msg = `Your leave request has been ${status} by ${approver.name}${rejection_reason ? ': ' + rejection_reason : ''}`;
    db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(sender.id, msg);
    io.to(`user_${sender.id}`).emit("notification", { message: msg });

    if (status === 'approved') {
      const supervisorMsg = `${sender.name} is on leave from ${leave.start_date} to ${leave.end_date}.`;
      
      // Notify Supervisors
      const supervisors = db.prepare("SELECT supervisor_id FROM user_supervisors WHERE user_id = ?").all(sender.id);
      supervisors.forEach((s: any) => {
        db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(s.supervisor_id, supervisorMsg);
        io.to(`user_${s.supervisor_id}`).emit("notification", { message: supervisorMsg });
      });

      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
      admins.forEach((admin: any) => {
        db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(admin.id, supervisorMsg);
        io.to(`user_${admin.id}`).emit("notification", { message: supervisorMsg });
      });
    }

    res.json({ success: true });
  });

  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all(req.params.userId);
    res.json(notifications);
  });

  app.post("/api/notifications/read", (req, res) => {
    const { userId } = req.body;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
    res.json({ success: true });
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`--- SERVING STATIC FILES FROM: ${distPath} ---`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("index.html not found in dist folder. Please run build.");
      }
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
