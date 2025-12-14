-- Create archives table for storing monthly archive metadata
CREATE TABLE IF NOT EXISTS archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archive_id TEXT UNIQUE NOT NULL,
    period_month TEXT NOT NULL,
    period_year TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    data_types TEXT[] NOT NULL DEFAULT '{}',
    total_records JSONB DEFAULT '{}'::jsonb,
    key_metrics JSONB DEFAULT '{}'::jsonb,
    file_metadata JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
DROP INDEX IF EXISTS idx_archives_period;
DROP INDEX IF EXISTS idx_archives_generated_by;
DROP INDEX IF EXISTS idx_archives_deleted_at;

CREATE INDEX idx_archives_period ON archives(period_year, period_month);
CREATE INDEX idx_archives_generated_by ON archives(generated_by);
CREATE INDEX idx_archives_deleted_at ON archives(deleted_at);

-- Create function to automatically log archive activities
CREATE OR REPLACE FUNCTION log_archive_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_user_role TEXT;
BEGIN
    -- Get user details for activity log
    SELECT name, role INTO v_user_name, v_user_role
    FROM staff
    WHERE id = NEW.generated_by;

    -- Log archive generation
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO activity_logs (
            user_id,
            user_name,
            user_role,
            action,
            action_category,
            action_description,
            resource_type,
            resource_id,
            resource_name,
            new_value,
            ip_address,
            device_info
        ) VALUES (
            NEW.generated_by,
            COALESCE(v_user_name, 'Unknown'),
            COALESCE(v_user_role, 'Unknown'),
            'EXPORT',
            'SYSTEM',
            'Generated archive for ' || NEW.period_month || ' ' || NEW.period_year,
            'archive',
            NEW.archive_id,
            NEW.period_month || ' ' || NEW.period_year || ' Archive',
            jsonb_build_object(
                'archive_id', NEW.archive_id,
                'period', NEW.period_month || ' ' || NEW.period_year,
                'data_types', NEW.data_types,
                'total_records', NEW.total_records
            ),
            '',
            ''
        );
    END IF;

    -- Log archive deletion (soft delete)
    IF (TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        SELECT name, role INTO v_user_name, v_user_role
        FROM staff
        WHERE id = NEW.deleted_by;
        
        INSERT INTO activity_logs (
            user_id,
            user_name,
            user_role,
            action,
            action_category,
            action_description,
            resource_type,
            resource_id,
            resource_name,
            previous_value,
            ip_address,
            device_info
        ) VALUES (
            NEW.deleted_by,
            COALESCE(v_user_name, 'Unknown'),
            COALESCE(v_user_role, 'Unknown'),
            'DELETE',
            'SYSTEM',
            'Deleted archive for ' || NEW.period_month || ' ' || NEW.period_year,
            'archive',
            NEW.archive_id,
            NEW.period_month || ' ' || NEW.period_year || ' Archive',
            jsonb_build_object(
                'archive_id', NEW.archive_id,
                'period', NEW.period_month || ' ' || NEW.period_year,
                'data_types', NEW.data_types
            ),
            '',
            ''
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for archive activity logging
DROP TRIGGER IF EXISTS trigger_log_archive_activity ON archives;
CREATE TRIGGER trigger_log_archive_activity
    AFTER INSERT OR UPDATE ON archives
    FOR EACH ROW
    EXECUTE FUNCTION log_archive_activity();

-- Add comments for documentation
COMMENT ON TABLE archives IS 'Stores metadata for generated monthly archives';
COMMENT ON COLUMN archives.archive_id IS 'Unique identifier for the archive';
COMMENT ON COLUMN archives.period_month IS 'Month name (e.g., "January")';
COMMENT ON COLUMN archives.period_year IS 'Year (e.g., "2024")';
COMMENT ON COLUMN archives.data_types IS 'Array of data types included (activity_logs, sales, staff_attendance)';
COMMENT ON COLUMN archives.total_records IS 'Count of records per data type';
COMMENT ON COLUMN archives.key_metrics IS 'Summary metrics (revenue, orders, staff count)';
COMMENT ON COLUMN archives.file_metadata IS 'Metadata about generated files';
COMMENT ON COLUMN archives.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN archives.deleted_by IS 'Staff who deleted the archive';
