-- Nokia Network Data Table Creation Script
-- Optimized for Nokia ONT performance monitoring data

DROP TABLE IF EXISTS nokia_data CASCADE;

CREATE TABLE nokia_data (
  id SERIAL PRIMARY KEY,
  
  -- Project linking
  project_id TEXT REFERENCES projects(id),
  
  -- Core Nokia equipment identifiers
  drop_number TEXT NOT NULL,                    -- Drop Number (e.g., DR1749954)
  serial_number TEXT NOT NULL,                  -- Serial Number (e.g., ALCLB465A671)
  
  -- Network addressing
  olt_address TEXT,                             -- OLT Address (e.g., law.olt.01:1-1-8-10)
  
  -- Signal measurements (converted to proper numeric types)
  ont_rx_signal_dbm DECIMAL(8,3),              -- ONT Rx SIG (dBm) - precise signal measurements
  link_budget_ont_olt_db DECIMAL(8,3),         -- Link Budget ONT->OLT (dB)
  olt_rx_signal_dbm DECIMAL(8,3),              -- OLT Rx SIG (dBm)
  link_budget_olt_ont_db DECIMAL(8,3),         -- Link Budget OLT->ONT (dB)
  current_ont_rx DECIMAL(8,3),                 -- Current ONT RX
  
  -- Equipment status and metadata
  status TEXT,                                  -- Status (Active, Inactive, etc.)
  team TEXT,                                    -- Team assignment (law1, law19, etc.)
  
  -- Location data
  latitude DECIMAL(10,7),                      -- GPS Latitude (high precision)
  longitude DECIMAL(10,7),                     -- GPS Longitude (high precision)
  
  -- Timing data
  measurement_timestamp DECIMAL(12,8),         -- Excel timestamp (convert to proper datetime)
  measurement_date DATE,                       -- Measurement date
  
  -- Import tracking
  import_batch_id TEXT NOT NULL,               -- Track import batches
  imported_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_drop_serial UNIQUE(drop_number, serial_number, measurement_date)
);

-- Performance indexes
CREATE INDEX idx_nokia_data_project_id ON nokia_data(project_id);
CREATE INDEX idx_nokia_data_drop_number ON nokia_data(drop_number);
CREATE INDEX idx_nokia_data_serial_number ON nokia_data(serial_number);
CREATE INDEX idx_nokia_data_status ON nokia_data(status);
CREATE INDEX idx_nokia_data_team ON nokia_data(team);
CREATE INDEX idx_nokia_data_measurement_date ON nokia_data(measurement_date);
CREATE INDEX idx_nokia_data_import_batch ON nokia_data(import_batch_id);
CREATE INDEX idx_nokia_data_location ON nokia_data(latitude, longitude);

-- Comments for documentation
COMMENT ON TABLE nokia_data IS 'Nokia ONT network performance and equipment monitoring data';
COMMENT ON COLUMN nokia_data.ont_rx_signal_dbm IS 'ONT received signal strength in dBm';
COMMENT ON COLUMN nokia_data.link_budget_ont_olt_db IS 'Link budget from ONT to OLT in dB';
COMMENT ON COLUMN nokia_data.olt_rx_signal_dbm IS 'OLT received signal strength in dBm';
COMMENT ON COLUMN nokia_data.link_budget_olt_ont_db IS 'Link budget from OLT to ONT in dB';
COMMENT ON COLUMN nokia_data.current_ont_rx IS 'Current ONT receive power';
COMMENT ON COLUMN nokia_data.measurement_timestamp IS 'Original Excel timestamp value';

-- Create view for easy data analysis
CREATE OR REPLACE VIEW nokia_data_summary AS
SELECT 
  project_id,
  status,
  team,
  measurement_date,
  COUNT(*) as equipment_count,
  AVG(ont_rx_signal_dbm) as avg_ont_signal,
  MIN(ont_rx_signal_dbm) as min_ont_signal,
  MAX(ont_rx_signal_dbm) as max_ont_signal,
  AVG(current_ont_rx) as avg_current_rx,
  COUNT(DISTINCT drop_number) as unique_drops
FROM nokia_data
GROUP BY project_id, status, team, measurement_date
ORDER BY measurement_date DESC, team;