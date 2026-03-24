# DealAirLock

DealAirLock is a hackathon prototype for governed investor operations.

The concept is simple:

- Auth0 Token Vault holds delegated access to investor tools and deal-room systems.
- PrysmAI governs how an AI agent uses that access.
- High-risk actions pause for approval instead of executing silently.

This first slice focuses on a FutureX-style SPV workflow:

- investor onboarding
- deal-room document prep
- subscription packet handling
- shareholder action approval

## What the prototype shows

- explicit permission boundaries for agent actions
- low, medium, and high-risk action classification
- approval gates for sensitive actions
- visible Auth0 scopes and connectors
- visible Prysm governance session, decisions, and evidence bundle

## Planned real integrations

- Auth0 for AI Agents Token Vault
- Prysm proxy and governance session APIs
- Gmail, Google Drive, DocuSign, and deal-room connectors

## Local development

```bash
pnpm install
pnpm dev
```

Then open the printed local URL.

## Environment

See `.env.example` for the placeholders this app will eventually need.
