[
  {
    "table_name": "activity_logs",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "activity_logs",
    "column_name": "timestamp",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "activity_logs",
    "column_name": "user_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "user_name",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "user_role",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "action",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "action_category",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "action_description",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "resource_type",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "resource_id",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "resource_name",
    "data_type": "character varying",
    "character_maximum_length": 200,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "previous_value",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "new_value",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "changes_summary",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "ip_address",
    "data_type": "character varying",
    "character_maximum_length": 45,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "device_info",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "session_id",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "severity",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'info'::character varying"
  },
  {
    "table_name": "activity_logs",
    "column_name": "tags",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "notes",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "activity_logs",
    "column_name": "is_reversible",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "archives",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "archives",
    "column_name": "archive_id",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "archives",
    "column_name": "period_month",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "archives",
    "column_name": "period_year",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "archives",
    "column_name": "generated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "archives",
    "column_name": "generated_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "archives",
    "column_name": "data_types",
    "data_type": "ARRAY",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "'{}'::text[]"
  },
  {
    "table_name": "archives",
    "column_name": "total_records",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_name": "archives",
    "column_name": "key_metrics",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_name": "archives",
    "column_name": "file_metadata",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_name": "archives",
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "archives",
    "column_name": "deleted_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "archives",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "archives",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "archives",
    "column_name": "csv_files",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "categories",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "categories",
    "column_name": "name",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "categories",
    "column_name": "icon",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "categories",
    "column_name": "sort_order",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "categories",
    "column_name": "is_active",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "true"
  },
  {
    "table_name": "categories",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "categories",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "categories",
    "column_name": "type",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'food'::character varying"
  },
  {
    "table_name": "customers",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "customers",
    "column_name": "phone",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customers",
    "column_name": "name",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customers",
    "column_name": "email",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "customers",
    "column_name": "loyalty_points",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "customers",
    "column_name": "member_since",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "CURRENT_DATE"
  },
  {
    "table_name": "customers",
    "column_name": "total_spent",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "customers",
    "column_name": "visit_count",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "customers",
    "column_name": "status",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": "'active'::character varying"
  },
  {
    "table_name": "customers",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "customers",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "inventory_items",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "inventory_items",
    "column_name": "name",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "inventory_items",
    "column_name": "category",
    "data_type": "character varying",
    "character_maximum_length": 50,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_items",
    "column_name": "current_stock",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "inventory_items",
    "column_name": "reorder_level",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "inventory_items",
    "column_name": "unit",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "inventory_items",
    "column_name": "supplier",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_items",
    "column_name": "cost_per_unit",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "inventory_items",
    "column_name": "last_restocked",
    "data_type": "date",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_items",
    "column_name": "status",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'in-stock'::character varying"
  },
  {
    "table_name": "inventory_items",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "inventory_items",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "order_items",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "order_items",
    "column_name": "order_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "product_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "product_name",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "quantity",
    "data_type": "integer",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "base_price",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "variants",
    "data_type": "jsonb",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "total_price",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "served",
    "data_type": "boolean",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "order_items",
    "column_name": "served_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "served_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "notes",
    "data_type": "text",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "order_items",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "order_items",
    "column_name": "kitchen_status",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'pending'::character varying"
  },
  {
    "table_name": "order_items",
    "column_name": "cooking_started_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "ready_at",
    "data_type": "timestamp without time zone",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "ready_by",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "served_by_role",
    "data_type": "character varying",
    "character_maximum_length": 10,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "order_items",
    "column_name": "served_by_code",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "table_name": "orders",
    "column_name": "order_number",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "customer_id",
    "data_type": "uuid",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "customer_name",
    "data_type": "character varying",
    "character_maximum_length": 100,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "table_number",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "order_type",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "status",
    "data_type": "character varying",
    "character_maximum_length": 30,
    "is_nullable": "NO",
    "column_default": "'new'::character varying"
  },
  {
    "table_name": "orders",
    "column_name": "subtotal",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "tax",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "orders",
    "column_name": "discount",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "orders",
    "column_name": "total",
    "data_type": "numeric",
    "character_maximum_length": null,
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "payment_method",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "orders",
    "column_name": "payment_status",
    "data_type": "character varying",
    "character_maximum_length": 20,
    "is_nullable": "YES",
    "column_default": "'pending'::character varying"
  }
]