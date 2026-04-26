# AstraLink Legal Readiness Checklist

This is an engineering checklist, not legal advice. Complete legal review before live users.

## Before Live Users

- Publish a privacy policy that names the controller/operator, contact channel, jurisdictions, subprocessors, and data categories.
- Explain sensitive data use: birth date, birth time, birth place, natal chart data, dating preferences, chat content, photos, device tokens, and AI-generated interpretations.
- Add explicit consent for sensitive astrology/dating data before onboarding completion.
- Explain that astrology and AI outputs are for entertainment/self-reflection, not medical, legal, financial, or safety advice.
- Provide account export and delete-account policy.
- Confirm delete account clears backend DB rows, Supabase Auth user, Storage media, Redis/user caches, and local mobile storage.
- Define retention windows using `docs/DATA_RETENTION_POLICY.md`.
- Document backup retention and restore limitations.
- Add a support process for access, export, deletion, and consent withdrawal requests.

## Later, When Production Data Becomes Valuable

- Enable Supabase PITR.
- Run a restore drill into a separate project.
- Verify restored DB, Auth rows, RLS policies, Storage buckets, and app env settings.
- Record restore time objective and manual steps that still remain.
