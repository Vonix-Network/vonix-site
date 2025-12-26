export PGPASSWORD=e5c7376473cdc8c3bba653e64dc87c2c74f4d888e16d8c5c
psql -U vonix -d vonix -h localhost << 'EOF'
ALTER TABLE discord_messages ADD CONSTRAINT discord_messages_discord_message_id_unique UNIQUE (discord_message_id);
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT users_minecraft_username_unique UNIQUE (minecraft_username);
ALTER TABLE users ADD CONSTRAINT users_minecraft_uuid_unique UNIQUE (minecraft_uuid);
ALTER TABLE users ADD CONSTRAINT users_discord_id_unique UNIQUE (discord_id);
ALTER TABLE site_settings ADD CONSTRAINT site_settings_key_unique UNIQUE (key);
ALTER TABLE api_keys ADD CONSTRAINT api_keys_name_unique UNIQUE (name);
ALTER TABLE forum_categories ADD CONSTRAINT forum_categories_slug_unique UNIQUE (slug);
EOF
