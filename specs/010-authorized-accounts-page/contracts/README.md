# API Contracts

**Feature**: 010-authorized-accounts-page

## Overview

This feature is a **UI skeleton with mock data** and does not require API contracts.

## Why No Contracts?

- No backend API calls - all data is mock
- No adapter integration - no blockchain reads/writes
- Pure presentation layer implementation

## Future Considerations

When this page is connected to real data (future spec), contracts may include:

- `GET /accounts` - Fetch authorized accounts for a contract
- `POST /accounts` - Add new authorization
- `DELETE /accounts/:id` - Revoke authorization
- `PATCH /accounts/:id/roles` - Update role assignments

These will be defined in the spec that adds real data integration.
