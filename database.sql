-- PostgreSQL-ready schema for production reservation tracking.
-- Use this when moving from the current local JSON storage to a real database.

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guests INTEGER NOT NULL CHECK (guests > 0),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example query to see all recent reservation requests:
-- SELECT * FROM reservations ORDER BY created_at DESC;

-- Example query for only pending reservations:
-- SELECT * FROM reservations WHERE status = 'pending' ORDER BY reservation_date ASC, reservation_time ASC;

-- Example query for a customer profile lookup:
-- SELECT * FROM customers WHERE email = 'customer@example.com';
