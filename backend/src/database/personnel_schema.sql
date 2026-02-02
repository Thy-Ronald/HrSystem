-- Personnel Data Sheet table
USE hr_system;

CREATE TABLE IF NOT EXISTS personnel_data_sheet (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Section 1: Personal Information
    date_started DATE NOT NULL,
    surname VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    
    -- Section 2: Basic Details
    date_of_birth DATE,
    place_of_birth VARCHAR(255),
    sex ENUM('Male', 'Female', 'Other'),
    civil_status VARCHAR(50),
    citizenship VARCHAR(100),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    blood_type VARCHAR(5),
    
    -- Section 3: Government Identification
    sss_number VARCHAR(50),
    pag_ibig_number VARCHAR(50),
    philhealth_number VARCHAR(50),
    tin VARCHAR(50),
    employee_number VARCHAR(50),
    
    -- Section 4: Contact Information
    residential_address TEXT,
    permanent_address TEXT,
    zip_code VARCHAR(20),
    telephone_number VARCHAR(50),
    cellphone_number VARCHAR(50) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    
    -- Section 5: In Case of Emergency
    emergency_name VARCHAR(255) NOT NULL,
    emergency_relationship VARCHAR(100),
    emergency_address TEXT,
    emergency_occupation VARCHAR(255),
    emergency_contact_number VARCHAR(50) NOT NULL,
    
    -- Section 6: Parent Information
    father_name VARCHAR(255),
    mother_maiden_name VARCHAR(255),
    parents_address TEXT,
    
    -- Section 7: Educational Background (JSON format)
    education_background JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_surname (surname),
    INDEX idx_employee_number (employee_number),
    INDEX idx_email (email_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
