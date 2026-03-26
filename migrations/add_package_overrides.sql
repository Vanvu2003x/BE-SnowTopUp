ALTER TABLE topup_packages
    ADD COLUMN api_package_name VARCHAR(255) NULL AFTER api_id,
    ADD COLUMN custom_package_name VARCHAR(255) NULL AFTER api_package_name;

UPDATE topup_packages
SET api_package_name = package_name
WHERE api_package_name IS NULL;
