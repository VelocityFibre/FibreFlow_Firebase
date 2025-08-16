-- FibreFlow Pole Management Schema for Neon
-- This schema consolidates all Firebase pole-related collections into a unified PostgreSQL structure
-- Created: 2025-01-30

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For GPS coordinates

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- Pole statuses
CREATE TYPE pole_status AS ENUM (
  'planned',
  'pending',
  'in_progress',
  'installed',
  'quality_checked',
  'approved',
  'rejected',
  'on_hold'
);

-- Drop/Home statuses
CREATE TYPE drop_status AS ENUM (
  'signup_requested',
  'signup_approved',
  'signup_declined',
  'installation_scheduled',
  'installation_in_progress',
  'connected',
  'activated',
  'suspended',
  'cancelled'
);

-- Import types
CREATE TYPE import_type AS ENUM (
  'csv',
  'excel',
  'onemap',
  'manual',
  'api'
);

-- Photo types
CREATE TYPE photo_type AS ENUM (
  'before',
  'front',
  'side',
  'depth',
  'concrete',
  'compaction'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Projects table (reference only - main data stays in Firebase)
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  project_code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main poles table (combines pole-trackers, planned-poles, pole-installations)
CREATE TABLE IF NOT EXISTS poles (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id),
  pole_number VARCHAR(100) UNIQUE NOT NULL,
  vf_pole_id VARCHAR(100) UNIQUE,
  
  -- Status and tracking
  status pole_status DEFAULT 'planned',
  installation_status VARCHAR(50),
  quality_checked BOOLEAN DEFAULT FALSE,
  quality_check_date TIMESTAMP,
  quality_checked_by VARCHAR(255),
  
  -- Location data
  location GEOGRAPHY(POINT, 4326), -- PostGIS point for GPS
  gps_accuracy FLOAT,
  zone VARCHAR(50),
  pon VARCHAR(50),
  distribution_or_feeder VARCHAR(50),
  
  -- Assignment data
  contractor_id VARCHAR(255),
  contractor_name VARCHAR(255),
  working_team VARCHAR(255),
  
  -- Installation data
  date_installed TIMESTAMP,
  pole_type VARCHAR(50),
  pole_height FLOAT,
  
  -- Import tracking
  import_batch_id VARCHAR(255),
  onemap_id VARCHAR(100),
  onemap_data JSONB,
  
  -- Capacity and connections
  max_capacity INTEGER DEFAULT 12,
  drop_count INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT check_drop_capacity CHECK (drop_count <= max_capacity)
);

-- Drops table (combines home-signups, homes-connected, homes-activated, drops)
CREATE TABLE IF NOT EXISTS drops (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  drop_number VARCHAR(100) UNIQUE NOT NULL,
  pole_id VARCHAR(255) REFERENCES poles(id),
  
  -- Status tracking
  status drop_status DEFAULT 'signup_requested',
  
  -- Customer data
  property_id VARCHAR(100),
  address TEXT,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  
  -- Technical data
  distance_to_pole FLOAT,
  cable_length FLOAT,
  cable_type VARCHAR(50),
  ont_serial VARCHAR(100),
  
  -- Location
  location GEOGRAPHY(POINT, 4326),
  
  -- Important dates
  signup_date TIMESTAMP,
  approval_date TIMESTAMP,
  installation_scheduled_date TIMESTAMP,
  connection_date TIMESTAMP,
  activation_date TIMESTAMP,
  
  -- Import tracking
  import_batch_id VARCHAR(255),
  onemap_id VARCHAR(100),
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Status history table (for both poles and drops)
CREATE TABLE IF NOT EXISTS status_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('pole', 'drop')),
  entity_id VARCHAR(255) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Photo uploads table
CREATE TABLE IF NOT EXISTS pole_photos (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  pole_id VARCHAR(255) NOT NULL REFERENCES poles(id),
  photo_type photo_type NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(50),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(pole_id, photo_type) -- One photo per type per pole
);

-- Import batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  import_type import_type NOT NULL,
  file_name VARCHAR(255),
  file_url TEXT,
  project_id VARCHAR(255) REFERENCES projects(id),
  
  -- Statistics
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Error tracking
  errors JSONB DEFAULT '[]',
  
  -- User tracking
  imported_by VARCHAR(255),
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Additional data
  metadata JSONB DEFAULT '{}'
);

-- Change history for audit trail
CREATE TABLE IF NOT EXISTS change_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  import_batch_id VARCHAR(255) REFERENCES import_batches(id),
  metadata JSONB DEFAULT '{}'
);

-- Permission conflicts table
CREATE TABLE IF NOT EXISTS permission_conflicts (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  pole_id VARCHAR(255) REFERENCES poles(id),
  conflict_type VARCHAR(50),
  permission_data JSONB,
  assignment_data JSONB,
  resolution_status VARCHAR(50) DEFAULT 'pending',
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offline queue for mobile sync
CREATE TABLE IF NOT EXISTS offline_queue (
  id VARCHAR(255) PRIMARY KEY DEFAULT generate_ulid(),
  device_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_data JSONB NOT NULL,
  sync_status VARCHAR(50) DEFAULT 'pending',
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMP,
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Poles indexes
CREATE INDEX idx_poles_project ON poles(project_id);
CREATE INDEX idx_poles_status ON poles(status);
CREATE INDEX idx_poles_contractor ON poles(contractor_id);
CREATE INDEX idx_poles_zone ON poles(zone);
CREATE INDEX idx_poles_location ON poles USING GIST(location);
CREATE INDEX idx_poles_created_at ON poles(created_at);
CREATE INDEX idx_poles_pole_number_lower ON poles(LOWER(pole_number));

-- Drops indexes
CREATE INDEX idx_drops_pole ON drops(pole_id);
CREATE INDEX idx_drops_status ON drops(status);
CREATE INDEX idx_drops_location ON drops USING GIST(location);
CREATE INDEX idx_drops_property ON drops(property_id);
CREATE INDEX idx_drops_drop_number_lower ON drops(LOWER(drop_number));

-- Status history indexes
CREATE INDEX idx_status_history_entity ON status_history(entity_type, entity_id);
CREATE INDEX idx_status_history_date ON status_history(changed_at);

-- Import batch indexes
CREATE INDEX idx_import_batches_project ON import_batches(project_id);
CREATE INDEX idx_import_batches_type ON import_batches(import_type);
CREATE INDEX idx_import_batches_date ON import_batches(imported_at);

-- Change history indexes
CREATE INDEX idx_change_history_entity ON change_history(entity_type, entity_id);
CREATE INDEX idx_change_history_date ON change_history(changed_at);

-- Offline queue indexes
CREATE INDEX idx_offline_queue_status ON offline_queue(sync_status);
CREATE INDEX idx_offline_queue_device ON offline_queue(device_id);
CREATE INDEX idx_offline_queue_user ON offline_queue(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_poles_updated_at BEFORE UPDATE ON poles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drops_updated_at BEFORE UPDATE ON drops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update pole drop count
CREATE OR REPLACE FUNCTION update_pole_drop_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.pole_id IS NOT NULL THEN
        UPDATE poles SET drop_count = drop_count + 1 WHERE id = NEW.pole_id;
    ELSIF TG_OP = 'DELETE' AND OLD.pole_id IS NOT NULL THEN
        UPDATE poles SET drop_count = drop_count - 1 WHERE id = OLD.pole_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.pole_id IS DISTINCT FROM NEW.pole_id THEN
            IF OLD.pole_id IS NOT NULL THEN
                UPDATE poles SET drop_count = drop_count - 1 WHERE id = OLD.pole_id;
            END IF;
            IF NEW.pole_id IS NOT NULL THEN
                UPDATE poles SET drop_count = drop_count + 1 WHERE id = NEW.pole_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply drop count trigger
CREATE TRIGGER update_drop_count AFTER INSERT OR UPDATE OR DELETE ON drops
    FOR EACH ROW EXECUTE FUNCTION update_pole_drop_count();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO status_history (entity_type, entity_id, old_status, new_status, changed_by)
        VALUES (TG_TABLE_NAME::text, NEW.id, OLD.status::text, NEW.status::text, NEW.updated_by);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply status history triggers
CREATE TRIGGER log_pole_status_change AFTER UPDATE ON poles
    FOR EACH ROW EXECUTE FUNCTION log_status_change();

CREATE TRIGGER log_drop_status_change AFTER UPDATE ON drops
    FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active poles view
CREATE VIEW active_poles AS
SELECT 
    p.*,
    pr.name as project_name,
    pr.project_code,
    COUNT(DISTINCT d.id) as actual_drop_count,
    ARRAY_AGG(d.drop_number) FILTER (WHERE d.drop_number IS NOT NULL) as connected_drops
FROM poles p
LEFT JOIN projects pr ON p.project_id = pr.id
LEFT JOIN drops d ON d.pole_id = p.id
WHERE p.status NOT IN ('rejected', 'cancelled')
GROUP BY p.id, pr.id;

-- Drops summary view
CREATE VIEW drops_summary AS
SELECT 
    d.*,
    p.pole_number,
    p.zone,
    p.pon,
    pr.name as project_name,
    pr.project_code
FROM drops d
LEFT JOIN poles p ON d.pole_id = p.id
LEFT JOIN projects pr ON p.project_id = pr.id;

-- Import statistics view
CREATE VIEW import_statistics AS
SELECT 
    import_type,
    COUNT(*) as total_imports,
    SUM(total_records) as total_records,
    SUM(success_count) as total_success,
    SUM(error_count) as total_errors,
    SUM(duplicate_count) as total_duplicates,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time_seconds
FROM import_batches
WHERE status = 'completed'
GROUP BY import_type;

-- =====================================================
-- FUNCTIONS FOR DATA VALIDATION
-- =====================================================

-- Function to validate pole number uniqueness
CREATE OR REPLACE FUNCTION validate_pole_number_unique(
    p_pole_number VARCHAR,
    p_exclude_id VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM poles 
        WHERE LOWER(pole_number) = LOWER(p_pole_number)
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to validate drop number uniqueness
CREATE OR REPLACE FUNCTION validate_drop_number_unique(
    p_drop_number VARCHAR,
    p_exclude_id VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM drops 
        WHERE LOWER(drop_number) = LOWER(p_drop_number)
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check pole capacity
CREATE OR REPLACE FUNCTION check_pole_capacity(
    p_pole_id VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_drop_count INTEGER;
    v_max_capacity INTEGER;
BEGIN
    SELECT drop_count, max_capacity 
    INTO v_drop_count, v_max_capacity
    FROM poles 
    WHERE id = p_pole_id;
    
    RETURN v_drop_count < v_max_capacity;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions to application user (adjust username as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO fibreflow_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO fibreflow_app;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO fibreflow_app;