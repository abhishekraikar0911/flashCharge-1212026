-- Optimize DataTransfer queries for VehicleInfo lookups
-- Run this on your MySQL database

-- Add index for faster VehicleInfo queries
ALTER TABLE data_transfer 
ADD INDEX IF NOT EXISTS idx_charger_message_time (charge_box_id, message_id, received_at DESC);

-- Verify index was created
SHOW INDEX FROM data_transfer WHERE Key_name = 'idx_charger_message_time';
