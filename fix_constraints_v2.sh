export PGPASSWORD=e5c7376473cdc8c3bba653e64dc87c2c74f4d888e16d8c5c
psql -U vonix -d vonix -h localhost << 'EOF'
-- Already done in previous step (but safe to repeat if wrap in try-catch or just check existence)
-- For simplicity, I'll just add the ones I missed.

ALTER TABLE users ADD CONSTRAINT users_stripe_customer_id_unique UNIQUE (stripe_customer_id);
ALTER TABLE users ADD CONSTRAINT users_stripe_subscription_id_unique UNIQUE (stripe_subscription_id);
ALTER TABLE users ADD CONSTRAINT users_square_customer_id_unique UNIQUE (square_customer_id);
ALTER TABLE users ADD CONSTRAINT users_square_subscription_id_unique UNIQUE (square_subscription_id);
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_token_unique UNIQUE (token);
ALTER TABLE registration_codes ADD CONSTRAINT registration_codes_code_unique UNIQUE (code);
ALTER TABLE servers ADD CONSTRAINT servers_api_key_unique UNIQUE (api_key);
ALTER TABLE guest_ticket_tokens ADD CONSTRAINT guest_ticket_tokens_token_unique UNIQUE (token);
ALTER TABLE ticket_settings ADD CONSTRAINT ticket_settings_guild_id_unique UNIQUE (guild_id);
EOF
