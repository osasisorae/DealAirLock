# DealAirLock Architecture

DealAirLock is a governed investor-operations agent.

## Core runtime

1. The operator starts a workflow such as SPV onboarding or exit-vote orchestration.
2. The app opens a Prysm governance session for the full workflow.
3. The app requests delegated access from Auth0 Token Vault for the exact connectors and scopes needed.
4. The agent executes low-risk steps inline.
5. High-risk external actions pause at a Prysm decision gate.
6. Step-up authentication is required before sensitive actions like investor email delivery or vote launch.
7. Prysm stores the evidence bundle for export or review.

## Connectors

- Gmail
- Google Drive
- CRM
- DocuSign
- Voting Portal

## Prysm surfaces exercised

- governance session start
- decision checkpoints
- approval receipts
- evidence bundle export
- policy provenance
- runtime trace and audit context

## Auth0 surfaces exercised

- Token Vault delegated scopes
- connector-specific access
- human approval boundaries
- step-up authentication

## Why this matters

The demo is not a chatbot. It is a controlled execution boundary for investor workflows where the AI agent may prepare work, but does not silently act outside approval and scope boundaries.
