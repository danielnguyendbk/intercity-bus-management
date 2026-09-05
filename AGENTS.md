# Repository Agent Guidance

These rules always apply to work in this repository.

- Read the relevant files under `docs/` before planning or changing a domain.
- Treat Django migrations as authoritative; never execute the reference SQL to create Django tables.
- Preserve the approved app ownership: `accounts`, `operations`, `bookings`, `payments`, and domain-neutral `common`.
- Do not create later-domain models early merely to satisfy a foreign key.
- Use Python 3.12 and the exact dependency pins in `requirements.txt`.
- Keep DRF authentication session-only until a separate requirement approves another mechanism.
- Reserve `/admin/` for Django Admin. Business authorization uses `User.role`, not `is_staff` or `is_superuser`.
- Keep MySQL-specific generated columns, triggers, and views in explicit, reversible migrations.
- Do not add business features or resolve open questions without approval.
- Keep changes scoped to the current phase and include proportional tests.
- Never commit secrets, `.env`, Google credentials, SePay secrets, or real webhook payloads.
- Do not commit, push, create issues, or open pull requests without explicit authorization.
