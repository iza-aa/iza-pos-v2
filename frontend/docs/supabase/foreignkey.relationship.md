[
  {
    "table_name": "activity_logs",
    "column_name": "user_id",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "archives",
    "column_name": "deleted_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "SET NULL"
  },
  {
    "table_name": "archives",
    "column_name": "generated_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "SET NULL"
  },
  {
    "table_name": "order_items",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "order_items",
    "column_name": "product_id",
    "foreign_table_name": "products",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "order_items",
    "column_name": "ready_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "order_items",
    "column_name": "served_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "orders",
    "column_name": "completed_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "orders",
    "column_name": "created_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "orders",
    "column_name": "customer_id",
    "foreign_table_name": "customers",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "created_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "pos_session_id",
    "foreign_table_name": "pos_sessions",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "pos_sessions",
    "column_name": "staff_id",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "presence_code",
    "column_name": "created_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "presensi_shift",
    "column_name": "staff_id",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "product_variant_groups",
    "column_name": "product_id",
    "foreign_table_name": "products",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "product_variant_groups",
    "column_name": "variant_group_id",
    "foreign_table_name": "variant_groups",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "products",
    "column_name": "category_id",
    "foreign_table_name": "categories",
    "foreign_column_name": "id",
    "delete_rule": "SET NULL"
  },
  {
    "table_name": "products",
    "column_name": "created_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "products",
    "column_name": "updated_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "recipe_ingredients",
    "column_name": "inventory_item_id",
    "foreign_table_name": "inventory_items",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "recipe_ingredients",
    "column_name": "recipe_id",
    "foreign_table_name": "recipes",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "recipes",
    "column_name": "created_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "recipes",
    "column_name": "product_id",
    "foreign_table_name": "products",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "staff",
    "column_name": "created_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "staff_shifts",
    "column_name": "created_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "staff_shifts",
    "column_name": "staff_id",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "tables",
    "column_name": "current_order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "usage_transaction_details",
    "column_name": "inventory_item_id",
    "foreign_table_name": "inventory_items",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "usage_transaction_details",
    "column_name": "usage_transaction_id",
    "foreign_table_name": "usage_transactions",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  },
  {
    "table_name": "usage_transactions",
    "column_name": "order_id",
    "foreign_table_name": "orders",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "usage_transactions",
    "column_name": "performed_by",
    "foreign_table_name": "staff",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "usage_transactions",
    "column_name": "product_id",
    "foreign_table_name": "products",
    "foreign_column_name": "id",
    "delete_rule": "NO ACTION"
  },
  {
    "table_name": "variant_options",
    "column_name": "variant_group_id",
    "foreign_table_name": "variant_groups",
    "foreign_column_name": "id",
    "delete_rule": "CASCADE"
  }
]