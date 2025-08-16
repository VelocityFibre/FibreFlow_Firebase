-- Staging table for field pole captures
-- This table receives data from Firebase for validation before moving to production

CREATE TABLE IF NOT EXISTS staging_poles (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) UNIQUE NOT NULL,
    pole_number VARCHAR(100) NOT NULL,
    project_id VARCHAR(100),
    gps_latitude DECIMAL(10, 8) NOT NULL,
    gps_longitude DECIMAL(11, 8) NOT NULL,
    gps_accuracy DECIMAL(10, 2),
    gps_captured_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'captured',
    contractor_id VARCHAR(100),
    notes TEXT,
    photo_urls JSONB DEFAULT '{}',
    device_id VARCHAR(100) NOT NULL,
    offline_created_at TIMESTAMP,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    api_key VARCHAR(100),
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_notes TEXT,
    validated_at TIMESTAMP,
    validated_by VARCHAR(100),
    moved_to_production BOOLEAN DEFAULT FALSE,
    production_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_staging_poles_submission_id ON staging_poles(submission_id);
CREATE INDEX idx_staging_poles_pole_number ON staging_poles(pole_number);
CREATE INDEX idx_staging_poles_device_id ON staging_poles(device_id);
CREATE INDEX idx_staging_poles_validation_status ON staging_poles(validation_status);
CREATE INDEX idx_staging_poles_created_at ON staging_poles(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staging_poles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staging_poles_updated_at_trigger
BEFORE UPDATE ON staging_poles
FOR EACH ROW
EXECUTE FUNCTION update_staging_poles_updated_at();

-- Comments for documentation
COMMENT ON TABLE staging_poles IS 'Staging table for field-captured pole data pending validation';
COMMENT ON COLUMN staging_poles.submission_id IS 'Unique ID from field app submission';
COMMENT ON COLUMN staging_poles.pole_number IS 'Pole identifier (e.g., LAW.P.B167)';
COMMENT ON COLUMN staging_poles.photo_urls IS 'JSON object with photo types and URLs';
COMMENT ON COLUMN staging_poles.validation_status IS 'pending, approved, rejected, or manual_review';
COMMENT ON COLUMN staging_poles.moved_to_production IS 'True when data has been moved to production tables';