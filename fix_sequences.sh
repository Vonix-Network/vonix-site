export PGPASSWORD=e5c7376473cdc8c3bba653e64dc87c2c74f4d888e16d8c5c

# This script finds all sequences in the public schema and updates them to the max value of the corresponding table's 'id' column.
# It assumes sequence names follow the pattern 'tablename_id_seq'.

TABLES=$(psql -U vonix -d vonix -h localhost -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';")

for table in $TABLES; do
    # Check if a sequence exists for this table
    SEQ=$(psql -U vonix -d vonix -h localhost -t -c "SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE relkind = 'S' AND relname = '${table}_id_seq' AND n.nspname = 'public';")
    
    if [ ! -z "$SEQ" ]; then
        echo "Updating sequence for $table..."
        psql -U vonix -d vonix -h localhost -c "SELECT setval('${table}_id_seq', (SELECT COALESCE(max(id), 1) FROM $table));"
    fi
done
