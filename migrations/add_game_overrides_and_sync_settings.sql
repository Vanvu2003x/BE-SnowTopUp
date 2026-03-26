ALTER TABLE games
ADD COLUMN api_name VARCHAR(100) NULL AFTER name,
ADD COLUMN custom_name VARCHAR(100) NULL AFTER api_name,
ADD COLUMN api_thumbnail VARCHAR(500) NULL AFTER thumbnail,
ADD COLUMN custom_thumbnail VARCHAR(500) NULL AFTER api_thumbnail,
ADD COLUMN poster VARCHAR(500) NULL AFTER custom_thumbnail;

UPDATE games
SET api_name = COALESCE(api_name, name)
WHERE api_name IS NULL;

UPDATE games
SET api_thumbnail = COALESCE(api_thumbnail, thumbnail)
WHERE api_thumbnail IS NULL AND thumbnail IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO app_settings (setting_key, setting_value)
VALUES ('partner_sync_interval_minutes', '30')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
