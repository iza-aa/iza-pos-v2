| table_name                         | column_name                 | data_type                   |
| ---------------------------------- | --------------------------- | --------------------------- |
| activity_logs                      | id                          | uuid                        |
| activity_logs                      | timestamp                   | timestamp without time zone |
| activity_logs                      | user_id                     | uuid                        |
| activity_logs                      | user_name                   | character varying           |
| activity_logs                      | user_role                   | character varying           |
| activity_logs                      | action                      | character varying           |
| activity_logs                      | action_category             | character varying           |
| activity_logs                      | action_description          | text                        |
| activity_logs                      | resource_type               | character varying           |
| activity_logs                      | resource_id                 | character varying           |
| activity_logs                      | resource_name               | character varying           |
| activity_logs                      | previous_value              | jsonb                       |
| activity_logs                      | new_value                   | jsonb                       |
| activity_logs                      | changes_summary             | ARRAY                       |
| activity_logs                      | ip_address                  | character varying           |
| activity_logs                      | device_info                 | text                        |
| activity_logs                      | session_id                  | character varying           |
| activity_logs                      | severity                    | character varying           |
| activity_logs                      | tags                        | ARRAY                       |
| activity_logs                      | notes                       | text                        |
| activity_logs                      | is_reversible               | boolean                     |
| attendance                         | id                          | uuid                        |
| attendance                         | staff_id                    | uuid                        |
| attendance                         | shift_id                    | uuid                        |
| attendance                         | presence_code_id            | uuid                        |
| attendance                         | attendance_date             | date                        |
| attendance                         | clock_in_at                 | timestamp without time zone |
| attendance                         | clock_out_at                | timestamp without time zone |
| attendance                         | clock_in_latitude           | double precision            |
| attendance                         | clock_in_longitude          | double precision            |
| attendance                         | clock_out_latitude          | double precision            |
| attendance                         | clock_out_longitude         | double precision            |
| attendance                         | clock_in_distance_meters    | numeric                     |
| attendance                         | clock_out_distance_meters   | numeric                     |
| attendance                         | clock_in_method             | character varying           |
| attendance                         | clock_out_method            | character varying           |
| attendance                         | check_in_status             | character varying           |
| attendance                         | check_out_status            | character varying           |
| attendance                         | late_reason                 | text                        |
| attendance                         | early_leave_reason          | text                        |
| attendance                         | overtime_reason             | text                        |
| attendance                         | notes                       | text                        |
| attendance                         | created_at                  | timestamp without time zone |
| attendance                         | updated_at                  | timestamp without time zone |
| bookkeeping_cash_deposits          | id                          | uuid                        |
| bookkeeping_cash_deposits          | shift_id                    | text                        |
| bookkeeping_cash_deposits          | staff_id                    | uuid                        |
| bookkeeping_cash_deposits          | envelope_number             | text                        |
| bookkeeping_cash_deposits          | expected_amount             | numeric                     |
| bookkeeping_cash_deposits          | submitted_amount            | numeric                     |
| bookkeeping_cash_deposits          | received_amount             | numeric                     |
| bookkeeping_cash_deposits          | status                      | text                        |
| bookkeeping_cash_deposits          | manager_id                  | uuid                        |
| bookkeeping_cash_deposits          | manager_notes               | text                        |
| bookkeeping_cash_deposits          | created_at                  | timestamp with time zone    |
| bookkeeping_cash_deposits          | verified_at                 | timestamp with time zone    |
| bookkeeping_cash_movements         | id                          | uuid                        |
| bookkeeping_cash_movements         | shift_id                    | text                        |
| bookkeeping_cash_movements         | staff_id                    | uuid                        |
| bookkeeping_cash_movements         | type                        | text                        |
| bookkeeping_cash_movements         | amount                      | numeric                     |
| bookkeeping_cash_movements         | reason                      | text                        |
| bookkeeping_cash_movements         | created_at                  | timestamp with time zone    |
| bookkeeping_daily_closings         | id                          | uuid                        |
| bookkeeping_daily_closings         | business_date               | date                        |
| bookkeeping_daily_closings         | gross_sales                 | numeric                     |
| bookkeeping_daily_closings         | discount_total              | numeric                     |
| bookkeeping_daily_closings         | net_sales                   | numeric                     |
| bookkeeping_daily_closings         | cogs_estimate               | numeric                     |
| bookkeeping_daily_closings         | expense_total               | numeric                     |
| bookkeeping_daily_closings         | gross_profit_estimate       | numeric                     |
| bookkeeping_daily_closings         | net_profit_estimate         | numeric                     |
| bookkeeping_daily_closings         | cash_expected               | numeric                     |
| bookkeeping_daily_closings         | cash_counted                | numeric                     |
| bookkeeping_daily_closings         | cash_difference             | numeric                     |
| bookkeeping_daily_closings         | unresolved_exception_count  | integer                     |
| bookkeeping_daily_closings         | status                      | text                        |
| bookkeeping_daily_closings         | approved_by                 | text                        |
| bookkeeping_daily_closings         | approved_at                 | timestamp with time zone    |
| bookkeeping_daily_closings         | notes                       | text                        |
| bookkeeping_daily_closings         | snapshot_json               | jsonb                       |
| bookkeeping_daily_closings         | created_at                  | timestamp with time zone    |
| bookkeeping_daily_closings         | updated_at                  | timestamp with time zone    |
| bookkeeping_daily_closings         | opening_cash_total          | numeric                     |
| bookkeeping_daily_closings         | expected_drawer_cash        | numeric                     |
| bookkeeping_daily_closings         | cash_to_deposit             | numeric                     |
| bookkeeping_daily_closings         | closing_float_total         | numeric                     |
| bookkeeping_entries                | id                          | uuid                        |
| bookkeeping_entries                | business_date               | date                        |
| bookkeeping_entries                | entry_at                    | timestamp with time zone    |
| bookkeeping_entries                | type                        | text                        |
| bookkeeping_entries                | category                    | text                        |
| bookkeeping_entries                | amount                      | numeric                     |
| bookkeeping_entries                | direction                   | text                        |
| bookkeeping_entries                | payment_method              | text                        |
| bookkeeping_entries                | source_table                | text                        |
| bookkeeping_entries                | source_id                   | text                        |
| bookkeeping_entries                | source_label                | text                        |
| bookkeeping_entries                | status                      | text                        |
| bookkeeping_entries                | note                        | text                        |
| bookkeeping_entries                | created_by                  | text                        |
| bookkeeping_entries                | created_at                  | timestamp with time zone    |
| bookkeeping_entries                | updated_at                  | timestamp with time zone    |
| bookkeeping_exceptions             | id                          | uuid                        |
| bookkeeping_exceptions             | business_date               | date                        |
| bookkeeping_exceptions             | severity                    | text                        |
| bookkeeping_exceptions             | type                        | text                        |
| bookkeeping_exceptions             | description                 | text                        |
| bookkeeping_exceptions             | source_table                | text                        |
| bookkeeping_exceptions             | source_id                   | text                        |
| bookkeeping_exceptions             | suggested_fix               | text                        |
| bookkeeping_exceptions             | status                      | text                        |
| bookkeeping_exceptions             | note                        | text                        |
| bookkeeping_exceptions             | resolved_by                 | text                        |
| bookkeeping_exceptions             | resolved_at                 | timestamp with time zone    |
| bookkeeping_exceptions             | created_at                  | timestamp with time zone    |
| bookkeeping_exceptions             | updated_at                  | timestamp with time zone    |
| bookkeeping_expenses               | id                          | uuid                        |
| bookkeeping_expenses               | expense_date                | date                        |
| bookkeeping_expenses               | category                    | text                        |
| bookkeeping_expenses               | amount                      | numeric                     |
| bookkeeping_expenses               | payment_method              | text                        |
| bookkeeping_expenses               | vendor                      | text                        |
| bookkeeping_expenses               | receipt_url                 | text                        |
| bookkeeping_expenses               | note                        | text                        |
| bookkeeping_expenses               | created_by                  | text                        |
| bookkeeping_expenses               | created_at                  | timestamp with time zone    |
| bookkeeping_expenses               | updated_at                  | timestamp with time zone    |
| bookkeeping_financial_settings     | id                          | text                        |
| bookkeeping_financial_settings     | tax_enabled                 | boolean                     |
| bookkeeping_financial_settings     | tax_label                   | text                        |
| bookkeeping_financial_settings     | tax_rate                    | numeric                     |
| bookkeeping_financial_settings     | service_charge_enabled      | boolean                     |
| bookkeeping_financial_settings     | service_charge_rate         | numeric                     |
| bookkeeping_financial_settings     | prices_include_tax          | boolean                     |
| bookkeeping_financial_settings     | updated_by                  | text                        |
| bookkeeping_financial_settings     | created_at                  | timestamp with time zone    |
| bookkeeping_financial_settings     | updated_at                  | timestamp with time zone    |
| bookkeeping_reports                | id                          | uuid                        |
| bookkeeping_reports                | report_type                 | text                        |
| bookkeeping_reports                | period_start                | date                        |
| bookkeeping_reports                | period_end                  | date                        |
| bookkeeping_reports                | status                      | text                        |
| bookkeeping_reports                | snapshot_json               | jsonb                       |
| bookkeeping_reports                | generated_by                | text                        |
| bookkeeping_reports                | generated_at                | timestamp with time zone    |
| bookkeeping_reports                | file_url                    | text                        |
| bookkeeping_reports                | created_at                  | timestamp with time zone    |
| bookkeeping_shift_closings         | id                          | uuid                        |
| bookkeeping_shift_closings         | business_date               | date                        |
| bookkeeping_shift_closings         | shift_id                    | text                        |
| bookkeeping_shift_closings         | shift_name                  | text                        |
| bookkeeping_shift_closings         | opened_at                   | timestamp with time zone    |
| bookkeeping_shift_closings         | closed_at                   | timestamp with time zone    |
| bookkeeping_shift_closings         | submitted_by                | text                        |
| bookkeeping_shift_closings         | gross_sales                 | numeric                     |
| bookkeeping_shift_closings         | discount_total              | numeric                     |
| bookkeeping_shift_closings         | net_sales                   | numeric                     |
| bookkeeping_shift_closings         | cash_expected               | numeric                     |
| bookkeeping_shift_closings         | cash_counted                | numeric                     |
| bookkeeping_shift_closings         | cash_difference             | numeric                     |
| bookkeeping_shift_closings         | non_cash_sales              | numeric                     |
| bookkeeping_shift_closings         | cancelled_count             | integer                     |
| bookkeeping_shift_closings         | refund_total                | numeric                     |
| bookkeeping_shift_closings         | status                      | text                        |
| bookkeeping_shift_closings         | notes                       | text                        |
| bookkeeping_shift_closings         | snapshot_json               | jsonb                       |
| bookkeeping_shift_closings         | created_at                  | timestamp with time zone    |
| bookkeeping_shift_closings         | updated_at                  | timestamp with time zone    |
| bookkeeping_shift_closings         | opening_cash                | numeric                     |
| bookkeeping_shift_closings         | expected_drawer_cash        | numeric                     |
| bookkeeping_shift_closings         | cash_to_deposit             | numeric                     |
| bookkeeping_shift_closings         | closing_float               | numeric                     |
| bookkeeping_shift_closings         | float_policy                | text                        |
| bookkeeping_shift_closings         | opening_cash_actual         | numeric                     |
| bookkeeping_shift_closings         | opening_variance            | numeric                     |
| bookkeeping_shift_closings         | opening_variance_note       | text                        |
| bookkeeping_shift_closings         | previous_shift_id           | text                        |
| bookkeeping_shift_closings         | actual_closing_float        | numeric                     |
| categories                         | id                          | uuid                        |
| categories                         | name                        | character varying           |
| categories                         | icon                        | character varying           |
| categories                         | sort_order                  | integer                     |
| categories                         | is_active                   | boolean                     |
| categories                         | created_at                  | timestamp without time zone |
| categories                         | updated_at                  | timestamp without time zone |
| categories                         | preparation_station         | character varying           |
| customer_point_transactions        | id                          | uuid                        |
| customer_point_transactions        | customer_id                 | uuid                        |
| customer_point_transactions        | order_id                    | uuid                        |
| customer_point_transactions        | reward_id                   | uuid                        |
| customer_point_transactions        | transaction_type            | character varying           |
| customer_point_transactions        | points                      | integer                     |
| customer_point_transactions        | balance_before              | integer                     |
| customer_point_transactions        | balance_after               | integer                     |
| customer_point_transactions        | description                 | text                        |
| customer_point_transactions        | metadata                    | jsonb                       |
| customer_point_transactions        | created_at                  | timestamp with time zone    |
| customer_reward_redemptions        | id                          | uuid                        |
| customer_reward_redemptions        | customer_id                 | uuid                        |
| customer_reward_redemptions        | reward_id                   | uuid                        |
| customer_reward_redemptions        | points_spent                | integer                     |
| customer_reward_redemptions        | code                        | character varying           |
| customer_reward_redemptions        | status                      | character varying           |
| customer_reward_redemptions        | redeemed_at                 | timestamp with time zone    |
| customer_reward_redemptions        | expires_at                  | timestamp with time zone    |
| customer_reward_redemptions        | used_at                     | timestamp with time zone    |
| customer_reward_redemptions        | used_order_id               | uuid                        |
| customer_reward_redemptions        | created_at                  | timestamp with time zone    |
| customer_reward_redemptions        | updated_at                  | timestamp with time zone    |
| customers                          | id                          | uuid                        |
| customers                          | phone                       | character varying           |
| customers                          | name                        | character varying           |
| customers                          | email                       | character varying           |
| customers                          | loyalty_points              | integer                     |
| customers                          | member_since                | date                        |
| customers                          | total_spent                 | numeric                     |
| customers                          | visit_count                 | integer                     |
| customers                          | status                      | character varying           |
| customers                          | created_at                  | timestamp without time zone |
| customers                          | updated_at                  | timestamp without time zone |
| customers                          | password_hash               | text                        |
| customers                          | last_login_at               | timestamp without time zone |
| customers                          | auth_user_id                | uuid                        |
| customers                          | auth_provider               | character varying           |
| floors                             | id                          | uuid                        |
| floors                             | name                        | character varying           |
| floors                             | floor_number                | integer                     |
| floors                             | is_active                   | boolean                     |
| floors                             | created_at                  | timestamp with time zone    |
| floors                             | updated_at                  | timestamp with time zone    |
| inventory_batch_movements          | id                          | uuid                        |
| inventory_batch_movements          | batch_id                    | uuid                        |
| inventory_batch_movements          | inventory_item_id           | uuid                        |
| inventory_batch_movements          | usage_transaction_id        | uuid                        |
| inventory_batch_movements          | usage_transaction_detail_id | uuid                        |
| inventory_batch_movements          | movement_type               | text                        |
| inventory_batch_movements          | quantity                    | numeric                     |
| inventory_batch_movements          | quantity_before             | numeric                     |
| inventory_batch_movements          | quantity_after              | numeric                     |
| inventory_batch_movements          | unit                        | text                        |
| inventory_batch_movements          | notes                       | text                        |
| inventory_batch_movements          | created_by_name             | text                        |
| inventory_batch_movements          | created_at                  | timestamp with time zone    |
| inventory_batches                  | id                          | uuid                        |
| inventory_batches                  | inventory_item_id           | uuid                        |
| inventory_batches                  | batch_number                | text                        |
| inventory_batches                  | supplier                    | text                        |
| inventory_batches                  | received_at                 | timestamp with time zone    |
| inventory_batches                  | expiry_date                 | date                        |
| inventory_batches                  | quantity_received           | numeric                     |
| inventory_batches                  | quantity_remaining          | numeric                     |
| inventory_batches                  | unit                        | text                        |
| inventory_batches                  | unit_cost                   | numeric                     |
| inventory_batches                  | source_transaction_id       | uuid                        |
| inventory_batches                  | created_by_name             | text                        |
| inventory_batches                  | created_at                  | timestamp with time zone    |
| inventory_batches                  | updated_at                  | timestamp with time zone    |
| inventory_batches                  | invoice_reference           | text                        |
| inventory_batches                  | receipt_url                 | text                        |
| inventory_items                    | id                          | uuid                        |
| inventory_items                    | name                        | character varying           |
| inventory_items                    | category                    | character varying           |
| inventory_items                    | current_stock               | numeric                     |
| inventory_items                    | reorder_level               | numeric                     |
| inventory_items                    | unit                        | character varying           |
| inventory_items                    | supplier                    | character varying           |
| inventory_items                    | cost_per_unit               | numeric                     |
| inventory_items                    | last_restocked              | date                        |
| inventory_items                    | status                      | character varying           |
| inventory_items                    | created_at                  | timestamp without time zone |
| inventory_items                    | updated_at                  | timestamp without time zone |
| inventory_items                    | station_scope               | text                        |
| inventory_items                    | tracking_mode               | text                        |
| inventory_items                    | par_level                   | numeric                     |
| kitchen_station_batches            | id                          | uuid                        |
| kitchen_station_batches            | inventory_item_id           | uuid                        |
| kitchen_station_batches            | source_batch_id             | uuid                        |
| kitchen_station_batches            | station_scope               | text                        |
| kitchen_station_batches            | station_status              | text                        |
| kitchen_station_batches            | batch_number                | text                        |
| kitchen_station_batches            | quantity_received           | numeric                     |
| kitchen_station_batches            | quantity_remaining          | numeric                     |
| kitchen_station_batches            | unit                        | text                        |
| kitchen_station_batches            | unit_cost                   | numeric                     |
| kitchen_station_batches            | started_at                  | timestamp with time zone    |
| kitchen_station_batches            | ready_at                    | timestamp with time zone    |
| kitchen_station_batches            | finished_at                 | timestamp with time zone    |
| kitchen_station_batches            | expiry_date                 | date                        |
| kitchen_station_batches            | created_by_name             | text                        |
| kitchen_station_batches            | notes                       | text                        |
| kitchen_station_batches            | created_at                  | timestamp with time zone    |
| kitchen_station_batches            | updated_at                  | timestamp with time zone    |
| kitchen_station_movements          | id                          | uuid                        |
| kitchen_station_movements          | station_batch_id            | uuid                        |
| kitchen_station_movements          | inventory_item_id           | uuid                        |
| kitchen_station_movements          | source_batch_id             | uuid                        |
| kitchen_station_movements          | usage_transaction_id        | uuid                        |
| kitchen_station_movements          | movement_type               | text                        |
| kitchen_station_movements          | quantity                    | numeric                     |
| kitchen_station_movements          | quantity_before             | numeric                     |
| kitchen_station_movements          | quantity_after              | numeric                     |
| kitchen_station_movements          | unit                        | text                        |
| kitchen_station_movements          | unit_cost                   | numeric                     |
| kitchen_station_movements          | total_cost                  | numeric                     |
| kitchen_station_movements          | business_date               | date                        |
| kitchen_station_movements          | shift_name                  | text                        |
| kitchen_station_movements          | notes                       | text                        |
| kitchen_station_movements          | created_by_name             | text                        |
| kitchen_station_movements          | created_at                  | timestamp with time zone    |
| kitchen_station_movements          | movement_status             | text                        |
| kitchen_station_movements          | closed_at                   | timestamp with time zone    |
| kitchen_station_shift_counts       | id                          | uuid                        |
| kitchen_station_shift_counts       | inventory_item_id           | uuid                        |
| kitchen_station_shift_counts       | business_date               | date                        |
| kitchen_station_shift_counts       | shift_name                  | text                        |
| kitchen_station_shift_counts       | opening_quantity            | numeric                     |
| kitchen_station_shift_counts       | transfer_in_quantity        | numeric                     |
| kitchen_station_shift_counts       | pos_usage_quantity          | numeric                     |
| kitchen_station_shift_counts       | waste_quantity              | numeric                     |
| kitchen_station_shift_counts       | expected_closing_quantity   | numeric                     |
| kitchen_station_shift_counts       | physical_closing_quantity   | numeric                     |
| kitchen_station_shift_counts       | variance_quantity           | numeric                     |
| kitchen_station_shift_counts       | unit                        | text                        |
| kitchen_station_shift_counts       | status                      | text                        |
| kitchen_station_shift_counts       | submitted_by_name           | text                        |
| kitchen_station_shift_counts       | submitted_at                | timestamp with time zone    |
| kitchen_station_shift_counts       | reviewed_by_name            | text                        |
| kitchen_station_shift_counts       | reviewed_at                 | timestamp with time zone    |
| kitchen_station_shift_counts       | notes                       | text                        |
| kitchen_station_shift_counts       | created_at                  | timestamp with time zone    |
| kitchen_station_shift_counts       | updated_at                  | timestamp with time zone    |
| loyalty_settings                   | id                          | text                        |
| loyalty_settings                   | points_per_amount           | integer                     |
| loyalty_settings                   | amount_per_points           | integer                     |
| loyalty_settings                   | minimum_order_amount        | integer                     |
| loyalty_settings                   | is_active                   | boolean                     |
| loyalty_settings                   | updated_by                  | text                        |
| loyalty_settings                   | updated_at                  | timestamp with time zone    |
| menu_bundle_items                  | id                          | uuid                        |
| menu_bundle_items                  | bundle_id                   | uuid                        |
| menu_bundle_items                  | product_id                  | uuid                        |
| menu_bundle_items                  | quantity                    | integer                     |
| menu_bundle_items                  | sort_order                  | integer                     |
| menu_bundle_items                  | created_at                  | timestamp with time zone    |
| menu_bundles                       | id                          | uuid                        |
| menu_bundles                       | name                        | text                        |
| menu_bundles                       | description                 | text                        |
| menu_bundles                       | bundle_price                | numeric                     |
| menu_bundles                       | is_active                   | boolean                     |
| menu_bundles                       | starts_at                   | date                        |
| menu_bundles                       | ends_at                     | date                        |
| menu_bundles                       | display_order               | integer                     |
| menu_bundles                       | created_by_name             | text                        |
| menu_bundles                       | created_at                  | timestamp with time zone    |
| menu_bundles                       | updated_at                  | timestamp with time zone    |
| order_corrections                  | id                          | uuid                        |
| order_corrections                  | order_id                    | uuid                        |
| order_corrections                  | order_number                | text                        |
| order_corrections                  | requested_by                | text                        |
| order_corrections                  | requested_by_name           | text                        |
| order_corrections                  | requested_by_role           | text                        |
| order_corrections                  | correction_type             | text                        |
| order_corrections                  | physical_status             | text                        |
| order_corrections                  | status                      | text                        |
| order_corrections                  | note                        | text                        |
| order_corrections                  | inventory_policy            | text                        |
| order_corrections                  | ledger_policy               | text                        |
| order_corrections                  | before_snapshot             | jsonb                       |
| order_corrections                  | created_at                  | timestamp with time zone    |
| order_corrections                  | updated_at                  | timestamp with time zone    |
| order_corrections                  | reviewed_by                 | text                        |
| order_corrections                  | reviewed_by_name            | text                        |
| order_corrections                  | reviewed_by_role            | text                        |
| order_corrections                  | reviewed_at                 | timestamp with time zone    |
| order_corrections                  | review_note                 | text                        |
| order_items                        | id                          | uuid                        |
| order_items                        | order_id                    | uuid                        |
| order_items                        | product_id                  | uuid                        |
| order_items                        | product_name                | character varying           |
| order_items                        | quantity                    | integer                     |
| order_items                        | base_price                  | numeric                     |
| order_items                        | variants                    | jsonb                       |
| order_items                        | total_price                 | numeric                     |
| order_items                        | served                      | boolean                     |
| order_items                        | served_at                   | timestamp without time zone |
| order_items                        | served_by                   | uuid                        |
| order_items                        | notes                       | text                        |
| order_items                        | created_at                  | timestamp without time zone |
| order_items                        | updated_at                  | timestamp without time zone |
| order_items                        | kitchen_status              | character varying           |
| order_items                        | cooking_started_at          | timestamp without time zone |
| order_items                        | ready_at                    | timestamp without time zone |
| order_items                        | ready_by                    | uuid                        |
| order_items                        | served_by_role              | character varying           |
| order_items                        | served_by_code              | character varying           |
| order_items                        | served_recorded_by          | uuid                        |
| order_items                        | assigned_barista_id         | uuid                        |
| order_items                        | assigned_barista_by         | uuid                        |
| order_items                        | assigned_barista_at         | timestamp with time zone    |
| orders                             | id                          | uuid                        |
| orders                             | order_number                | character varying           |
| orders                             | customer_id                 | uuid                        |
| orders                             | customer_name               | character varying           |
| orders                             | table_number                | character varying           |
| orders                             | order_type                  | character varying           |
| orders                             | status                      | character varying           |
| orders                             | subtotal                    | numeric                     |
| orders                             | tax                         | numeric                     |
| orders                             | discount                    | numeric                     |
| orders                             | total                       | numeric                     |
| orders                             | payment_method              | character varying           |
| orders                             | payment_status              | character varying           |
| orders                             | order_date                  | date                        |
| orders                             | order_time                  | time without time zone      |
| orders                             | created_at                  | timestamp without time zone |
| orders                             | updated_at                  | timestamp without time zone |
| orders                             | completed_at                | timestamp without time zone |
| orders                             | created_by                  | uuid                        |
| orders                             | completed_by                | uuid                        |
| orders                             | created_by_role             | character varying           |
| orders                             | created_by_code             | character varying           |
| orders                             | served_by_roles             | ARRAY                       |
| orders                             | created_by_staff_code       | character varying           |
| orders                             | created_by_staff_name       | character varying           |
| orders                             | served_by_staff_codes       | ARRAY                       |
| orders                             | order_source                | character varying           |
| orders                             | table_id                    | uuid                        |
| orders                             | notes                       | text                        |
| orders                             | fulfillment_method          | character varying           |
| orders                             | pickup_code                 | character varying           |
| orders                             | table_session_id            | uuid                        |
| orders                             | reward_redemption_id        | uuid                        |
| owner_ai_recommendations           | id                          | uuid                        |
| owner_ai_recommendations           | owner_id                    | text                        |
| owner_ai_recommendations           | category                    | text                        |
| owner_ai_recommendations           | local_date                  | date                        |
| owner_ai_recommendations           | period_key                  | text                        |
| owner_ai_recommendations           | insights_json               | jsonb                       |
| owner_ai_recommendations           | snapshot_json               | jsonb                       |
| owner_ai_recommendations           | generated_at                | timestamp with time zone    |
| owner_ai_recommendations           | expires_at                  | timestamp with time zone    |
| owner_ai_recommendations           | generation_count            | integer                     |
| owner_ai_recommendations           | created_at                  | timestamp with time zone    |
| owner_ai_recommendations           | updated_at                  | timestamp with time zone    |
| payment_transactions               | id                          | uuid                        |
| payment_transactions               | order_id                    | uuid                        |
| payment_transactions               | payment_method              | character varying           |
| payment_transactions               | amount_paid                 | numeric                     |
| payment_transactions               | amount_change               | numeric                     |
| payment_transactions               | transaction_reference       | character varying           |
| payment_transactions               | status                      | character varying           |
| payment_transactions               | created_at                  | timestamp without time zone |
| payment_transactions               | created_by                  | uuid                        |
| presence_code                      | id                          | uuid                        |
| presence_code                      | code                        | character varying           |
| presence_code                      | expires_at                  | timestamp without time zone |
| presence_code                      | created_by                  | uuid                        |
| presence_code                      | created_at                  | timestamp without time zone |
| presence_code                      | used_count                  | integer                     |
| presence_code                      | shift_id                    | uuid                        |
| presence_code                      | attendance_date             | date                        |
| presence_code                      | is_active                   | boolean                     |
| product_variant_groups             | id                          | uuid                        |
| product_variant_groups             | product_id                  | uuid                        |
| product_variant_groups             | variant_group_id            | uuid                        |
| product_variant_groups             | created_at                  | timestamp without time zone |
| product_variant_recipe_adjustments | id                          | uuid                        |
| product_variant_recipe_adjustments | product_id                  | uuid                        |
| product_variant_recipe_adjustments | variant_option_id           | uuid                        |
| product_variant_recipe_adjustments | inventory_item_id           | uuid                        |
| product_variant_recipe_adjustments | adjustment_quantity         | numeric                     |
| product_variant_recipe_adjustments | notes                       | text                        |
| product_variant_recipe_adjustments | created_at                  | timestamp without time zone |
| product_variant_recipe_adjustments | updated_at                  | timestamp without time zone |
| products                           | id                          | uuid                        |
| products                           | name                        | character varying           |
| products                           | category_id                 | uuid                        |
| products                           | description                 | text                        |
| products                           | price                       | numeric                     |
| products                           | image                       | text                        |
| products                           | stock                       | integer                     |
| products                           | available                   | boolean                     |
| products                           | has_variants                | boolean                     |
| products                           | created_at                  | timestamp without time zone |
| products                           | updated_at                  | timestamp without time zone |
| products                           | created_by                  | uuid                        |
| products                           | updated_by                  | uuid                        |
| products                           | type                        | character varying           |
| push_subscriptions                 | id                          | uuid                        |
| push_subscriptions                 | user_id                     | uuid                        |
| push_subscriptions                 | role                        | text                        |
| push_subscriptions                 | endpoint                    | text                        |
| push_subscriptions                 | auth_keys                   | jsonb                       |
| push_subscriptions                 | created_at                  | timestamp with time zone    |
| push_subscriptions                 | last_seen_at                | timestamp with time zone    |
| recipe_ingredients                 | id                          | uuid                        |
| recipe_ingredients                 | recipe_id                   | uuid                        |
| recipe_ingredients                 | inventory_item_id           | uuid                        |
| recipe_ingredients                 | ingredient_name             | character varying           |
| recipe_ingredients                 | quantity_needed             | numeric                     |
| recipe_ingredients                 | unit                        | character varying           |
| recipe_ingredients                 | created_at                  | timestamp without time zone |
| recipe_ingredients                 | costing_mode                | text                        |
| recipes                            | id                          | uuid                        |
| recipes                            | product_id                  | uuid                        |
| recipes                            | product_name                | character varying           |
| recipes                            | recipe_type                 | character varying           |
| recipes                            | variant_combination         | jsonb                       |
| recipes                            | created_at                  | timestamp without time zone |
| recipes                            | updated_at                  | timestamp without time zone |
| recipes                            | created_by                  | uuid                        |
| recipes                            | variant_name                | character varying           |
| recipes                            | is_override                 | boolean                     |
| recipes                            | modifier_percentage         | numeric                     |
| recipes                            | modifier_type               | character varying           |
| recipes                            | recipe_scope                | character varying           |
| recipes                            | is_active                   | boolean                     |
| rewards                            | id                          | uuid                        |
| rewards                            | name                        | character varying           |
| rewards                            | description                 | text                        |
| rewards                            | reward_type                 | character varying           |
| rewards                            | discount_type               | character varying           |
| rewards                            | discount_value              | numeric                     |
| rewards                            | max_discount_amount         | numeric                     |
| rewards                            | product_id                  | uuid                        |
| rewards                            | points_required             | integer                     |
| rewards                            | minimum_order_amount        | numeric                     |
| rewards                            | valid_days                  | integer                     |
| rewards                            | usage_limit                 | integer                     |
| rewards                            | used_count                  | integer                     |
| rewards                            | is_active                   | boolean                     |
| rewards                            | starts_at                   | timestamp with time zone    |
| rewards                            | ends_at                     | timestamp with time zone    |
| rewards                            | created_at                  | timestamp with time zone    |
| rewards                            | updated_at                  | timestamp with time zone    |
| shifts                             | id                          | uuid                        |
| shifts                             | shift_name                  | character varying           |
| shifts                             | start_time                  | time without time zone      |
| shifts                             | check_in_grace_until        | time without time zone      |
| shifts                             | end_time                    | time without time zone      |
| shifts                             | check_out_grace_until       | time without time zone      |
| shifts                             | description                 | text                        |
| shifts                             | is_active                   | boolean                     |
| shifts                             | created_by                  | uuid                        |
| shifts                             | created_at                  | timestamp without time zone |
| shifts                             | updated_at                  | timestamp without time zone |
| shifts                             | check_in_window_start       | time without time zone      |
| shifts                             | check_out_window_end        | time without time zone      |
| staff                              | id                          | uuid                        |
| staff                              | staff_code                  | character varying           |
| staff                              | name                        | character varying           |
| staff                              | email                       | character varying           |
| staff                              | phone                       | character varying           |
| staff                              | role                        | character varying           |
| staff                              | status                      | character varying           |
| staff                              | password_hash               | character varying           |
| staff                              | login_code                  | character varying           |
| staff                              | login_code_expires_at       | timestamp without time zone |
| staff                              | profile_picture             | text                        |
| staff                              | hired_date                  | date                        |
| staff                              | created_at                  | timestamp without time zone |
| staff                              | updated_at                  | timestamp without time zone |
| staff                              | created_by                  | uuid                        |
| staff                              | shift_id                    | uuid                        |
| staff                              | pin_hash                    | text                        |
| staff                              | must_change_pin             | boolean                     |
| staff                              | pin_updated_at              | timestamp without time zone |
| staff                              | pin_reset_at                | timestamp without time zone |
| staff                              | login_code_created_at       | timestamp without time zone |
| staff                              | reset_token                 | text                        |
| staff                              | reset_token_expires_at      | timestamp with time zone    |
| staff_positions                    | id                          | uuid                        |
| staff_positions                    | staff_id                    | uuid                        |
| staff_positions                    | position                    | text                        |
| staff_positions                    | is_primary                  | boolean                     |
| staff_positions                    | is_active                   | boolean                     |
| staff_positions                    | created_at                  | timestamp with time zone    |
| staff_positions                    | updated_at                  | timestamp with time zone    |
| staff_shift_daily_assignments      | id                          | uuid                        |
| staff_shift_daily_assignments      | staff_id                    | text                        |
| staff_shift_daily_assignments      | shift_id                    | text                        |
| staff_shift_daily_assignments      | work_date                   | date                        |
| staff_shift_daily_assignments      | status                      | text                        |
| staff_shift_daily_assignments      | assigned_by                 | text                        |
| staff_shift_daily_assignments      | note                        | text                        |
| staff_shift_daily_assignments      | created_at                  | timestamp with time zone    |
| staff_shift_daily_assignments      | updated_at                  | timestamp with time zone    |
| staff_shift_weekly_assignments     | id                          | uuid                        |
| staff_shift_weekly_assignments     | staff_id                    | text                        |
| staff_shift_weekly_assignments     | weekday                     | integer                     |
| staff_shift_weekly_assignments     | shift_id                    | text                        |
| staff_shift_weekly_assignments     | status                      | text                        |
| staff_shift_weekly_assignments     | assigned_by                 | text                        |
| staff_shift_weekly_assignments     | note                        | text                        |
| staff_shift_weekly_assignments     | created_at                  | timestamp with time zone    |
| staff_shift_weekly_assignments     | updated_at                  | timestamp with time zone    |
| stock_reports                      | id                          | uuid                        |
| stock_reports                      | inventory_item_id           | uuid                        |
| stock_reports                      | material_name               | text                        |
| stock_reports                      | report_type                 | text                        |
| stock_reports                      | quantity_note               | text                        |
| stock_reports                      | description                 | text                        |
| stock_reports                      | status                      | text                        |
| stock_reports                      | reported_by                 | uuid                        |
| stock_reports                      | reported_by_name            | text                        |
| stock_reports                      | reported_by_role            | text                        |
| stock_reports                      | reviewed_by                 | uuid                        |
| stock_reports                      | reviewed_by_name            | text                        |
| stock_reports                      | reviewed_at                 | timestamp with time zone    |
| stock_reports                      | review_note                 | text                        |
| stock_reports                      | created_at                  | timestamp with time zone    |
| stock_reports                      | updated_at                  | timestamp with time zone    |
| stock_reports                      | station_scope               | text                        |
| store_settings                     | id                          | uuid                        |
| store_settings                     | store_name                  | character varying           |
| store_settings                     | store_latitude              | double precision            |
| store_settings                     | store_longitude             | double precision            |
| store_settings                     | attendance_radius_meters    | integer                     |
| store_settings                     | is_active                   | boolean                     |
| store_settings                     | created_at                  | timestamp without time zone |
| store_settings                     | updated_at                  | timestamp without time zone |
| table_sessions                     | id                          | uuid                        |
| table_sessions                     | table_id                    | uuid                        |
| table_sessions                     | customer_count              | integer                     |
| table_sessions                     | customer_name               | character varying           |
| table_sessions                     | started_at                  | timestamp with time zone    |
| table_sessions                     | ended_at                    | timestamp with time zone    |
| table_sessions                     | duration_minutes            | integer                     |
| table_sessions                     | order_ids                   | ARRAY                       |
| table_sessions                     | total_orders                | integer                     |
| table_sessions                     | total_revenue               | numeric                     |
| table_sessions                     | notes                       | text                        |
| table_sessions                     | created_at                  | timestamp with time zone    |
| tables                             | id                          | uuid                        |
| tables                             | table_number                | character varying           |
| tables                             | floor_id                    | uuid                        |
| tables                             | capacity                    | integer                     |
| tables                             | shape                       | character varying           |
| tables                             | status                      | character varying           |
| tables                             | qr_code_url                 | text                        |
| tables                             | qr_code_image               | text                        |
| tables                             | qr_generated_at             | timestamp with time zone    |
| tables                             | position_x                  | integer                     |
| tables                             | position_y                  | integer                     |
| tables                             | current_order_id            | uuid                        |
| tables                             | occupied_at                 | timestamp with time zone    |
| tables                             | occupied_by_customer        | character varying           |
| tables                             | is_active                   | boolean                     |
| tables                             | notes                       | text                        |
| tables                             | created_at                  | timestamp with time zone    |
| tables                             | updated_at                  | timestamp with time zone    |
| usage_transaction_details          | id                          | uuid                        |
| usage_transaction_details          | usage_transaction_id        | uuid                        |
| usage_transaction_details          | inventory_item_id           | uuid                        |
| usage_transaction_details          | ingredient_name             | character varying           |
| usage_transaction_details          | quantity_used               | numeric                     |
| usage_transaction_details          | unit                        | character varying           |
| usage_transaction_details          | previous_stock              | numeric                     |
| usage_transaction_details          | new_stock                   | numeric                     |
| usage_transaction_details          | created_at                  | timestamp without time zone |
| usage_transactions                 | id                          | uuid                        |
| usage_transactions                 | timestamp                   | timestamp without time zone |
| usage_transactions                 | type                        | character varying           |
| usage_transactions                 | product_id                  | uuid                        |
| usage_transactions                 | product_name                | character varying           |
| usage_transactions                 | quantity_sold               | integer                     |
| usage_transactions                 | notes                       | text                        |
| usage_transactions                 | performed_by                | uuid                        |
| usage_transactions                 | created_at                  | timestamp without time zone |
| usage_transactions                 | order_id                    | uuid                        |
| usage_transactions                 | transaction_type            | character varying           |
| usage_transactions                 | performed_by_name           | text                        |
| variant_groups                     | id                          | uuid                        |
| variant_groups                     | name                        | character varying           |
| variant_groups                     | type                        | character varying           |
| variant_groups                     | required                    | boolean                     |
| variant_groups                     | is_active                   | boolean                     |
| variant_groups                     | created_at                  | timestamp without time zone |
| variant_groups                     | updated_at                  | timestamp without time zone |
| variant_options                    | id                          | uuid                        |
| variant_options                    | variant_group_id            | uuid                        |
| variant_options                    | name                        | character varying           |
| variant_options                    | price_modifier              | numeric                     |
| variant_options                    | sort_order                  | integer                     |
| variant_options                    | is_active                   | boolean                     |
| variant_options                    | created_at                  | timestamp without time zone |
| variant_options                    | updated_at                  | timestamp without time zone |