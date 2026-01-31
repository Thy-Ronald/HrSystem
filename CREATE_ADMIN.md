# How to Create an Admin Account

Since all new signups are automatically assigned the "employee" role, you need to create admin accounts manually. Here are the methods:

## Method 1: Using the Script (Recommended)

### Interactive Mode
Run the script without arguments and it will prompt you for the details:

```bash
cd backend
npm run create-admin
```

Or directly:
```bash
cd backend
node src/scripts/createAdmin.js
```

### Command Line Mode
Provide the email, password, and name as arguments:

```bash
cd backend
node src/scripts/createAdmin.js admin@example.com password123 "Admin User"
```

## Method 2: Direct SQL (Alternative)

If you prefer to use SQL directly, you can run this in your MySQL client:

```sql
USE hr_system;

-- Replace with your desired values
INSERT INTO users (email, password_hash, name, role) 
VALUES (
  'admin@example.com',
  '$2b$10$YourHashedPasswordHere',  -- Use bcrypt to hash your password
  'Admin User',
  'admin'
);
```

**Note:** You'll need to hash the password using bcrypt. You can use an online bcrypt generator or the Node.js script.

## Method 3: Update Existing Employee to Admin

If you already have an employee account and want to make it an admin:

```sql
USE hr_system;

UPDATE users 
SET role = 'admin' 
WHERE email = 'employee@example.com';
```

## Security Notes

- Use a strong password for admin accounts
- Keep admin credentials secure
- Consider using environment variables for admin creation in production
- Regularly review admin accounts
