CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, -- The recipient (admin)
  type VARCHAR(50) NOT NULL, -- 'monitoring_disconnect', 'contract_expiry', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSON, -- Additional data (e.g., sessionId, employeeId)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
