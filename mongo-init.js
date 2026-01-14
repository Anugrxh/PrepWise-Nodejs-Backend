// MongoDB initialization script for production
db = db.getSiblingDB('prepwise');

// Create application user with read/write permissions
db.createUser({
  user: 'example_prepwise_user',
  pwd: 'example_prepwise_secure_password_456',
  roles: [
    {
      role: 'readWrite',
      db: 'prepwise'
    }
  ]
});

console.log('MongoDB user created successfully');