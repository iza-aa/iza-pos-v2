[
  {
    "trigger_name": "trigger_cleanup_archive_csv",
    "table_name": "archives",
    "action_statement": "EXECUTE FUNCTION cleanup_archive_csv_files()",
    "action_timing": "AFTER",
    "event_manipulation": "UPDATE"
  },
  {
    "trigger_name": "trigger_log_archive_activity",
    "table_name": "archives",
    "action_statement": "EXECUTE FUNCTION log_archive_activity()",
    "action_timing": "AFTER",
    "event_manipulation": "UPDATE"
  },
  {
    "trigger_name": "trigger_log_archive_activity",
    "table_name": "archives",
    "action_statement": "EXECUTE FUNCTION log_archive_activity()",
    "action_timing": "AFTER",
    "event_manipulation": "INSERT"
  },
  {
    "trigger_name": "trigger_deduct_inventory_on_item",
    "table_name": "order_items",
    "action_statement": "EXECUTE FUNCTION deduct_inventory_on_order_item()",
    "action_timing": "AFTER",
    "event_manipulation": "INSERT"
  },
  {
    "trigger_name": "update_order_items_updated_at",
    "table_name": "order_items",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE"
  },
  {
    "trigger_name": "update_orders_updated_at",
    "table_name": "orders",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE"
  },
  {
    "trigger_name": "trigger_set_presensi_status",
    "table_name": "presensi_shift",
    "action_statement": "EXECUTE FUNCTION set_presensi_status()",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT"
  },
  {
    "trigger_name": "update_presensi_shift_updated_at",
    "table_name": "presensi_shift",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE"
  },
  {
    "trigger_name": "trigger_log_product_changes",
    "table_name": "products",
    "action_statement": "EXECUTE FUNCTION log_product_changes()",
    "action_timing": "AFTER",
    "event_manipulation": "UPDATE"
  },
  {
    "trigger_name": "update_staff_shifts_updated_at",
    "table_name": "staff_shifts",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE"
  }
]