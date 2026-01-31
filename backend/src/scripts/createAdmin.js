/**
 * Script to create an admin account
 * Usage: node src/scripts/createAdmin.js <email> <password> <name>
 * Example: node src/scripts/createAdmin.js admin@example.com password123 "Admin User"
 */

const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const readline = require('readline');

const SALT_ROUNDS = 10;

async function createAdmin(email, password, name) {
  try {
    console.log('Creating admin account...');

    // Validate input
    if (!email || !password || !name) {
      console.error('Error: Email, password, and name are required');
      console.log('\nUsage: node src/scripts/createAdmin.js <email> <password> <name>');
      console.log('Example: node src/scripts/createAdmin.js admin@example.com password123 "Admin User"');
      process.exit(1);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      console.error('Error: Invalid email format');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('Error: Password must be at least 6 characters long');
      process.exit(1);
    }

    // Check if user already exists
    const existingUsers = await query(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      if (user.role === 'admin') {
        console.log('✓ Admin account already exists with this email');
        process.exit(0);
      } else {
        // Update existing user to admin
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await query(
          'UPDATE users SET password_hash = ?, name = ?, role = ? WHERE email = ?',
          [passwordHash, name.trim(), 'admin', email.toLowerCase().trim()]
        );
        console.log('✓ Existing user updated to admin role');
        console.log(`  Email: ${email}`);
        console.log(`  Name: ${name}`);
        console.log(`  Role: admin`);
        process.exit(0);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create admin user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES (?, ?, ?, ?)`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), 'admin']
    );

    console.log('✓ Admin account created successfully!');
    console.log(`  ID: ${result.insertId}`);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: admin`);
    console.log('\nYou can now log in with this account.');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating admin account:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('  Email already exists. Use a different email or update the existing account.');
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('=== Create Admin Account ===\n');

  rl.question('Email: ', (email) => {
    rl.question('Password: ', (password) => {
      rl.question('Full Name: ', (name) => {
        rl.close();
        createAdmin(email, password, name);
      });
    });
  });
} else if (args.length === 3) {
  // Command line mode
  const [email, password, name] = args;
  createAdmin(email, password, name);
} else {
  console.error('Error: Invalid number of arguments');
  console.log('\nUsage: node src/scripts/createAdmin.js <email> <password> <name>');
  console.log('Example: node src/scripts/createAdmin.js admin@example.com password123 "Admin User"');
  console.log('\nOr run without arguments for interactive mode:');
  console.log('node src/scripts/createAdmin.js');
  process.exit(1);
}
