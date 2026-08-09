# Yachiyo

Yachiyo is a public Discord server manager inspired by the Cosmic Princess Kaguya: calm, celestial, and authoritative.

The first release focuses on moderation, audit logs, and a global economy. Slash commands and `.` prefix commands are supported.

## Railway setup

1. Create a Railway PostgreSQL service.
2. Add `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `DATABASE_URL` as variables.
3. Run `npm install`, then `npm run db:migrate`.
4. Deploy with `npm start`.

Economy balances are global by Discord user ID. Server-specific settings and moderation cases remain scoped to each guild.
