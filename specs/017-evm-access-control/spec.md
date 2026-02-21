# Feature Specification: EVM Access Control Integration

**Feature Branch**: `017-evm-access-control`  
**Created**: 2026-02-11  
**Status**: Draft  
**Scope**: Enable EVM ecosystem in the Role Manager using the new Access Control module from the EVM adapter  
**Input**: User description: "EVM integration in the Role Manager using the new Access Control module in the EVM adapter."

## Clarifications

### Session 2026-02-11

- Q: Which EVM wallet provider library? → A: Use wagmi with the **custom UI kit** already available in the EVM adapter (not RainbowKit). The adapter exposes `EvmWalletUiRoot` as the React provider and `getEcosystemWalletComponents()` for wallet UI.
- Q: How is the contract ABI sourced? → A: For this iteration, **only verified contracts** are supported. The ABI is automatically fetched from Etherscan (V2 unified API) / Sourcify via the adapter's `loadContract(address)` method. No manual ABI pasting needed.
- Q: How should "expiration ledger" terminology be handled? → A: Fix at the **ui-types package level**. Introduce adapter-driven, chain-agnostic expiration metadata so the UI never hardcodes "ledger" or "block". This is a prerequisite cross-cutting change across ui-types, adapters, and Role Manager.
- Q: Are EVM-specific operations (renounce, cancel, delay) in scope? → A: **Yes, in scope**. The Role Manager must be intelligent enough to surface these operations when the adapter reports they are available, in a **chain-agnostic** way.
- Q: How are role labels displayed for bytes32 hashes? → A: The EVM adapter has improved role label resolution with three layers: (1) well-known dictionary (DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE, BURNER_ROLE, UPGRADER_ROLE), (2) ABI-based discovery (scans contract for `*_ROLE` / `*Role` constant functions and calls them to resolve hash → name), (3) external labels via `addKnownRoleIds()`. Labels arrive pre-resolved in the `RoleIdentifier.label` field.
- Q: What external credentials/keys does the EVM configuration require? → A: Follow the **UI Builder's existing configuration pattern**. Etherscan V2 API key in `.env.local` (`VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY`). WalletConnect project ID and wallet UI kit config in `public/app.config.json` under `globalServiceConfigs`. The adapter reads all credentials internally via `AppConfigService` — no manual wiring needed by the Role Manager.
- Q: What confirmation pattern should renounce actions use? → A: **Type-to-confirm** pattern — user must type a confirmation keyword (e.g., "RENOUNCE") to enable the submit button. This is the industry standard for irreversible destructive blockchain operations.
- Q: Are prerequisite ui-types & adapter changes part of this branch? → A: **No, prerequisites land separately first** as a new ui-types + adapter release. This feature branch only contains Role Manager changes. The prerequisite section documents what must be released upstream before this work begins.
- Q: How does seamless ecosystem switching work for wallet UI? → A: **Single-provider pattern** via `WalletStateProvider` (from `@openzeppelin/ui-builder-react`). Only one ecosystem provider is mounted at a time (`EvmWalletUiRoot` or `StellarWalletUiRoot`), swapped via React `key` prop. Previous provider stays mounted during loading to prevent flicker. `AdapterProvider` maintains adapter singletons so switching back reuses the existing adapter instance. The Role Manager already has this infrastructure (`WalletStateProvider`, `AdapterProvider`, `WalletSyncProvider`). This pattern is proven in the UI Builder and openzeppelin-ui example app.
- Q: Is there an ecosystem selection page? → A: **No**. There is no standalone ecosystem selection screen. The user picks the ecosystem inside the **Add Contract dialog** via `CompactEcosystemSelector` (a grid of ecosystem buttons), then selects a network and enters the contract address. After that, ecosystem switching happens **automatically** when the user selects a saved contract from the dropdown — `selectContractById` triggers `setSelectedNetwork`, which flows through `WalletSyncProvider` to swap the wallet provider.

## Context & Background

### Current State

The Role Manager currently supports Stellar as its only enabled ecosystem. The architecture is ecosystem-agnostic: UI components, React Query hooks, and mutation hooks all operate against the `AccessControlService` interface from `@openzeppelin/ui-types`. The EVM adapter package (`@openzeppelin/ui-builder-adapter-evm`) has recently introduced a full `EvmAccessControlService` that implements this same interface.

### EVM Adapter Access Control Module

The `EvmAccessControlService` (in `adapter-evm-core`) provides:

- **Ownership**: `getOwnership`, `transferOwnership`, `acceptOwnership`, `renounceOwnership`
- **Admin (AccessControlDefaultAdminRules)**: `getAdminInfo`, `transferAdminRole`, `acceptAdminTransfer`, `cancelAdminTransfer`, `changeAdminDelay`, `rollbackAdminDelay`
- **Roles**: `getCurrentRoles`, `getCurrentRolesEnriched`, `grantRole`, `revokeRole`, `renounceRole`
- **Discovery**: `getCapabilities`, `getHistory`, `exportSnapshot`, `discoverKnownRoleIds`
- **Registration**: `registerContract`, `addKnownRoleIds`
- **Feature detection** via ABI analysis (Ownable, Ownable2Step, AccessControl, AccessControlEnumerable, AccessControlDefaultAdminRules)
- **Indexer integration** for enriched data with graceful degradation
- **Transaction execution** decoupled via `EvmTransactionExecutor` callback

### EVM Adapter Wallet Integration

The EVM adapter already bundles a complete wallet solution:

- **Wagmi custom UI kit**: `WagmiWalletImplementation` with connectors for injected wallets, MetaMask, Safe, and WalletConnect
- **React provider**: `EvmWalletUiRoot` wraps `WagmiProvider` + `QueryClientProvider`; exposed via `adapter.getEcosystemReactUiContextProvider()`
- **Wallet components**: `adapter.getEcosystemWalletComponents()` returns resolved connect/disconnect UI components
- **Chain switching**: Handled automatically by wagmi when the selected network doesn't match the wallet's current chain
- **Transaction execution**: `EvmAdapter.signAndBroadcast()` → `executeEvmTransaction()` → wagmi's `getWalletClient()`

### EVM Adapter Contract Loading (Verified Contracts)

The EVM adapter provides automatic ABI fetching for verified contracts:

- **`adapter.loadContract(address)`**: Takes a contract address and automatically fetches the ABI
- **Provider priority**: Etherscan V2 unified API → Etherscan V1 (legacy) → Sourcify
- **Proxy detection**: Automatically detects proxy contracts and fetches implementation ABI
- **Verification status**: `loadContractWithMetadata()` returns `verificationStatus: 'verified' | 'unverified' | 'unknown'`
- **Error handling**: Unverified contracts produce a clear "Contract not verified" error

### EVM Adapter Role Label Resolution

The adapter resolves human-readable labels for bytes32 role hashes via three layers:

1. **Well-known dictionary**: `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`, `BURNER_ROLE`, `UPGRADER_ROLE` — mapped by hash to label
2. **ABI-based discovery** (`role-discovery.ts`): Scans the contract ABI for functions ending in `_ROLE` or `Role` (view/pure, no inputs, bytes32 output), calls them on-chain in parallel to build a hash → name map
3. **External labels**: Via `addKnownRoleIds()` with `{ id, label }` pairs

Labels are stored per-contract in `EvmAccessControlContext.roleLabelMap` and returned pre-resolved in `RoleIdentifier.label`. The Role Manager UI simply displays `role.label` when present, falling back to displaying the truncated hash with copy-to-clipboard.

### Seamless Ecosystem Switching (Proven Pattern)

Seamless switching between EVM and Stellar (and future ecosystems) without page reloads is already implemented in the UI Builder and the openzeppelin-ui example app. The pattern:

1. **Single-provider mounting**: `WalletStateProvider` renders one ecosystem provider at a time (`EvmWalletUiRoot` or `StellarWalletUiRoot`), swapped via a React `key` prop based on `ecosystem-networkId`.
2. **Flicker prevention**: During transition, the previous provider stays mounted while the new adapter loads and configures its UI kit. The new provider mounts only after configuration completes.
3. **Adapter singletons**: `AdapterProvider` maintains adapter instances. Switching back to a previously visited ecosystem reuses the existing adapter — no re-initialization.
4. **Wallet connections are per-ecosystem**: Each ecosystem manages its own connection state. Switching ecosystems disconnects the previous wallet. Switching back does not auto-reconnect (user must reconnect).
5. **App state survives switches**: `ContractContext` (selected contract, ecosystem) lives outside `WalletStateProvider`, so it persists across provider remounts.

### Integration Infrastructure Already in Place

The Role Manager already has:

- EVM entry in `ECOSYSTEM_REGISTRY` (disabled: `enabled: false`, `disabledLabel: 'Coming Soon'`)
- EVM metadata in `ecosystemRegistry` (`EvmAdapter`, `evmNetworks`)
- Static import for `@openzeppelin/ui-builder-adapter-evm` in `ecosystemManager.ts`
- `WalletStateProvider` (from `@openzeppelin/ui-builder-react`) — the core ecosystem switching mechanism
- `AdapterProvider` — manages adapter singletons, handles `getAdapter()` calls
- `WalletSyncProvider` — bridges `ContractContext.selectedNetwork` → `WalletStateProvider.setActiveNetworkId()`, handles EVM chain switching via `NetworkSwitchManager`
- `loadAppConfigModule` — native config loader for wallet UI kit configuration
- All UI hooks are ecosystem-agnostic (work through `AccessControlService` interface)

### Key Differences from Stellar Adapter

| Aspect                | Stellar                                    | EVM                                                                                                  |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Address format        | Base32 public key (56 chars)               | 0x-prefixed hex (42 chars)                                                                           |
| Expiration model      | Ledger numbers                             | No expiration for Ownable2Step; UNIX timestamp accept schedule for AccessControlDefaultAdminRules    |
| Role identifiers      | String-based                               | bytes32 hashes with multi-layer label resolution (well-known + ABI discovery + external)             |
| Feature detection     | Contract metadata                          | ABI function signature analysis                                                                      |
| Contract loading      | Contract ID + WASM metadata                | Auto-fetch ABI from Etherscan/Sourcify for verified contracts                                        |
| Wallet connection     | Stellar Wallets Kit (Freighter, etc.)      | Wagmi custom UI kit (MetaMask, WalletConnect, Safe, injected)                                        |
| Additional operations | None                                       | `renounceOwnership`, `renounceRole`, `cancelAdminTransfer`, `changeAdminDelay`, `rollbackAdminDelay` |
| Enriched data         | Always available                           | Requires access control indexer (graceful degradation if unavailable)                                |
| Chain switching       | Not applicable (single network per wallet) | Required (wallet must match target chain)                                                            |

### Gaps Requiring Attention

1. **Expiration terminology in ui-types** (prerequisite): `expirationBlock` field name and "expiration ledger" terminology throughout the codebase must be replaced with chain-agnostic, adapter-driven expiration metadata. This is a cross-cutting change to `ui-types`, adapters, and the Role Manager.
2. **New operations not in `AccessControlService` interface**: `renounceOwnership`, `renounceRole`, `cancelAdminTransfer`, `changeAdminDelay`, `rollbackAdminDelay` are currently EVM-only extensions that do NOT exist on the shared `AccessControlService` interface in `ui-types` v1.7.0. To support them chain-agnostically, they must be added as **optional methods** to the interface, with corresponding **capability flags** in `AccessControlCapabilities`.
3. **Capability flags missing**: `AccessControlCapabilities` currently lacks flags for the new operations (e.g., `hasRenounceOwnership`, `hasRenounceRole`, `hasCancelAdminTransfer`, `hasAdminDelayManagement`). These are needed so the UI can conditionally show actions based on adapter-reported capabilities.
4. **Indexer dependency**: Enriched role data (`getCurrentRolesEnriched`) and history depend on the access control indexer URL being configured in the network config.

## Scope Boundaries

**Chain-Agnostic Constraint (NON-NEGOTIABLE)**: The Role Manager UI MUST NOT contain `if (ecosystem === 'evm')`, `if (ecosystem === 'stellar')`, or any equivalent chain-identity branching for feature toggling. All feature availability is driven exclusively by adapter-reported capability flags. This is enforced by constitution principle I.

**In Scope**:

- Enable the EVM ecosystem in the Role Manager registry
- EVM wallet connection via the adapter's wagmi custom UI kit
- Contract loading for verified contracts (auto-fetch ABI from Etherscan/Sourcify)
- All read operations: capabilities, ownership, admin info, roles, enriched roles, history
- All existing write operations: grant role, revoke role, transfer ownership, accept ownership, transfer admin, accept admin
- **New chain-agnostic operations**: renounce ownership, renounce role, cancel admin transfer, change admin delay, rollback admin delay — surfaced in the UI when the adapter reports the capability
- Chain-agnostic expiration metadata (prerequisite ui-types + adapter changes)
- New capability flags and optional service methods in ui-types
- Graceful handling of missing indexer (fallback to on-chain-only data)
- Role label display using adapter-provided labels

**Out of Scope**:

- Manual ABI pasting for unverified contracts (future enhancement)
- Multi-sig / relayer execution flows
- Access control indexer deployment and configuration (assumes available or graceful degradation)
- RainbowKit integration (using custom UI kit only)

## Prerequisite: ui-types & Adapter Changes

The following changes to the shared `@openzeppelin/ui-types` package and adapters are prerequisites for this feature. They ensure chain-agnostic support for EVM-specific operations and expiration handling.

**These changes must be released upstream (new versions of ui-types, adapter-evm, adapter-stellar) before this feature branch begins implementation.** This branch will only contain Role Manager changes and will depend on the updated package versions.

### 1. Chain-Agnostic Expiration Metadata

**Problem**: The current `expirationBlock` field (type `number | undefined`) conflates different semantics across chains:

- Stellar: ledger number (required for two-step transfers)
- EVM Ownable2Step: no expiration (omitted)
- EVM AccessControlDefaultAdminRules: UNIX timestamp in seconds (accept schedule)

The Role Manager UI currently hardcodes "expiration ledger" in labels, comments, and tests.

**Required change**: Introduce adapter-driven expiration metadata in ui-types so the UI can render the correct label and input format without chain-specific knowledge. The adapter must communicate what kind of expiration value it uses (if any), and the appropriate display label.

### 2. New Optional Methods on `AccessControlService`

**Problem**: `renounceOwnership`, `renounceRole`, `cancelAdminTransfer`, `changeAdminDelay`, `rollbackAdminDelay` exist only on `EvmAccessControlService` and are not part of the shared interface.

**Required change**: Add these as **optional methods** (with `?`) to the `AccessControlService` interface:

- `renounceOwnership?(contractAddress, executionConfig, onStatusChange?, runtimeApiKey?)` → `Promise<OperationResult>`
- `renounceRole?(contractAddress, roleId, account, executionConfig, onStatusChange?, runtimeApiKey?)` → `Promise<OperationResult>`
- `cancelAdminTransfer?(contractAddress, executionConfig, onStatusChange?, runtimeApiKey?)` → `Promise<OperationResult>`
- `changeAdminDelay?(contractAddress, newDelay, executionConfig, onStatusChange?, runtimeApiKey?)` → `Promise<OperationResult>`
- `rollbackAdminDelay?(contractAddress, executionConfig, onStatusChange?, runtimeApiKey?)` → `Promise<OperationResult>`

### 3. New Capability Flags on `AccessControlCapabilities`

**Required change**: Add capability flags so the UI can conditionally render actions:

- `hasRenounceOwnership?: boolean` — contract supports ownership renunciation (default `false` when omitted)
- `hasRenounceRole?: boolean` — contract supports self-revocation of roles (default `false` when omitted)
- `hasCancelAdminTransfer?: boolean` — contract supports canceling pending admin transfers (default `false` when omitted)
- `hasAdminDelayManagement?: boolean` — contract supports changing/rolling back admin delays (default `false` when omitted)

All new flags default to `false` when omitted, ensuring backward compatibility with older adapter versions that do not report them.

### 4. Admin Delay Info Extension

**Problem**: `AdminInfo` currently lacks admin transfer delay data needed for the `AdminDelayPanel` UI. The EVM adapter reads `defaultAdminDelay` on-chain but does not include it in the `AdminInfo` response type.

**Required change**: Extend `AdminInfo` in ui-types with an optional `delayInfo` field:

- `delayInfo?: { currentDelay: number; pendingDelay?: { newDelay: number; effectAt: number } }` — admin transfer delay in seconds, with optional pending delay change

### 5. Expiration Metadata Method

**Required change**: Add an optional method to retrieve adapter-driven expiration semantics:

- `getExpirationMetadata?(contractAddress: string, transferType: 'ownership' | 'admin')` → `Promise<ExpirationMetadata>` — invoked per-contract and per-transfer-type (ownership vs admin), so the UI can adapt expiration UI for each transfer dialog independently.

### 6. Adapter Updates

Both the EVM and Stellar adapters must be updated to:

- Implement the new optional methods (EVM: yes for all; Stellar: no-op / not implemented)
- Report the new capability flags (EVM: based on ABI detection; Stellar: all `false`)
- Provide chain-agnostic expiration metadata
- Extend `AdminInfo` with `delayInfo` (EVM: populated from on-chain; Stellar: omitted)

### 7. Versioning & Compatibility

- The upstream release SHOULD be a **semver minor** version bump (new optional fields and methods are backward-compatible additions).
- The Role Manager's `package.json` MUST pin minimum versions: `@openzeppelin/ui-types >= X.Y.0`, `@openzeppelin/ui-builder-adapter-evm >= X.Y.0`, `@openzeppelin/ui-builder-adapter-stellar >= X.Y.0` (exact versions determined at release time).
- **Graceful degradation with old packages**: If the Role Manager is run with an older ui-types version, the new optional methods (`renounceOwnership`, etc.) simply won't exist on the service object, and the new capability flags will be `undefined` (treated as `false`). The UI will not display the new features. This is safe and expected — no crash, no error.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add EVM Contract and Connect Wallet (Priority: P1)

As a user, I want to add an EVM contract via the Add Contract dialog (selecting the EVM ecosystem and network) and connect my EVM wallet so that I can manage access control on EVM-compatible contracts.

**Why this priority**: Without adding an EVM contract and connecting a wallet, no EVM operations are possible. This is the entry point for all EVM functionality.

**Independent Test**: Can be fully tested by opening the Add Contract dialog, selecting EVM ecosystem, choosing a network, entering a verified contract address, and verifying the wallet connect UI appears and works.

**Acceptance Scenarios**:

1. **Given** I open the Add Contract dialog, **When** I see the ecosystem selector (CompactEcosystemSelector), **Then** "Ethereum (EVM)" is available as a selectable option alongside Stellar.
2. **Given** I select "Ethereum (EVM)" in the dialog, **When** the network dropdown loads, **Then** I see available EVM networks (e.g., Sepolia, Mainnet).
3. **Given** I have added an EVM contract, **When** the contract is selected, **Then** the wallet UI switches to the EVM wallet provider and I can connect an EVM wallet (MetaMask or similar).
4. **Given** I am connected to a different chain than the selected network, **When** the contract loads, **Then** the system prompts me to switch chains in my wallet.
5. **Given** I have saved contracts on both Stellar and EVM networks, **When** I select a contract from the dropdown, **Then** the ecosystem and wallet provider switch automatically without page reload.

---

### User Story 2 - Add Verified EVM Contract (Priority: P1)

As a user, I want to add a verified EVM contract by providing its address so that the system automatically fetches the ABI and detects access control capabilities.

**Why this priority**: Contract registration is required before any access control operations. Automatic ABI fetching for verified contracts provides the best user experience.

**Independent Test**: Can be fully tested by entering a verified contract address, waiting for ABI auto-fetch, and verifying detected capabilities are displayed.

**Acceptance Scenarios**:

1. **Given** I am on the contract addition screen with EVM ecosystem active, **When** I enter a valid EVM contract address (0x format), **Then** the system automatically fetches the ABI from Etherscan/Sourcify.
2. **Given** the contract is verified on Etherscan, **When** the ABI is fetched, **Then** the system registers the contract and detects capabilities (Ownable, AccessControl, etc.).
3. **Given** the contract is a proxy, **When** the ABI is fetched, **Then** the system detects the proxy and fetches the implementation ABI.
4. **Given** the contract is NOT verified on any supported source, **When** fetching completes, **Then** the system displays a clear "Contract not verified" error message.
5. **Given** a contract with Ownable + AccessControl + AccessControlEnumerable, **When** registration completes, **Then** capabilities show `hasOwnable: true`, `hasAccessControl: true`, `hasEnumerableRoles: true`.

---

### User Story 3 - View Roles and Ownership on EVM Contract (Priority: P1)

As a user, I want to view the roles, ownership, and admin state of an EVM contract so that I understand who has what permissions.

**Why this priority**: Read operations are the foundation — users need to see the current state before making changes.

**Independent Test**: Can be tested by adding an EVM contract and navigating to the Roles page to verify roles, ownership, and admin status are displayed correctly.

**Acceptance Scenarios**:

1. **Given** an EVM contract with AccessControlEnumerable, **When** I view the Roles page, **Then** I see all current role assignments with member addresses.
2. **Given** an EVM contract with Ownable, **When** I view the Roles page, **Then** I see the synthesized Owner role with the owner address.
3. **Given** an EVM contract with AccessControlDefaultAdminRules, **When** I view the Roles page, **Then** I see the synthesized Admin role with the admin address.
4. **Given** the access control indexer is unavailable, **When** I view roles, **Then** I see role assignments from on-chain data (without grant timestamps), and no error is displayed.
5. **Given** roles have bytes32 hash identifiers, **When** I view the roles list, **Then** roles with resolved labels (from well-known dictionary or ABI discovery) show human-readable names, and unresolved roles show truncated hash with copy option.

---

### User Story 4 - Grant and Revoke Roles on EVM Contract (Priority: P1)

As a role admin on an EVM contract, I want to grant and revoke roles so that I can manage access control permissions.

**Why this priority**: Role management is the core function of the Role Manager. Grant and revoke are the most common operations.

**Independent Test**: Can be tested by granting a role to an address, verifying it appears in the roles list, then revoking it and verifying removal.

**Acceptance Scenarios**:

1. **Given** I am a role admin, **When** I click "Grant Role" and provide a valid EVM address, **Then** a transaction is sent to the contract and the role is granted after confirmation.
2. **Given** I see an account with a role, **When** I click "Revoke Role" and confirm, **Then** a transaction is sent and the role is revoked after confirmation.
3. **Given** a transaction is pending, **When** I view the dialog, **Then** I see status updates (signing → submitting → confirming → confirmed).
4. **Given** I reject the transaction in my wallet, **When** the dialog updates, **Then** I see the form state preserved with an option to retry.

---

### User Story 5 - Transfer Ownership and Admin on EVM Contract (Priority: P2)

As the owner or admin of an EVM contract, I want to transfer ownership or admin role using the appropriate transfer mechanism so that I can securely hand over control.

**Why this priority**: Two-step transfers are important but less frequent than role grant/revoke. The UI patterns already exist from Stellar support.

**Independent Test**: Can be tested by initiating an ownership transfer, verifying pending state, then accepting from the target wallet.

**Acceptance Scenarios**:

1. **Given** I am the owner of an Ownable2Step contract, **When** I initiate a transfer, **Then** I provide the new owner address (no expiration — EVM Ownable2Step has no expiration).
2. **Given** a pending ownership transfer exists, **When** the pending owner connects their wallet, **Then** they see "Accept Ownership" and can complete the transfer.
3. **Given** I am the admin of an AccessControlDefaultAdminRules contract, **When** I initiate an admin transfer, **Then** the system uses the adapter's admin transfer mechanism (delay-based accept schedule, not user-specified expiration).
4. **Given** a pending admin transfer exists and has expired, **When** I view the Admin role, **Then** I see "Transfer Expired" status.

---

### User Story 6 - Renounce Ownership and Roles (Priority: P2)

As the owner of an EVM contract or a role holder, I want to renounce my ownership or role so that I can permanently relinquish my privileges.

**Why this priority**: Renunciation is a security-critical operation that should be available when the adapter supports it. Less common than transfers but important for contract lifecycle management.

**Independent Test**: Can be tested by renouncing ownership of a contract and verifying the owner becomes zero address, or renouncing a role and verifying removal.

**Acceptance Scenarios**:

1. **Given** I am the owner and the adapter reports `hasRenounceOwnership` capability, **When** I view the Owner role actions, **Then** I see a "Renounce Ownership" action.
2. **Given** I click "Renounce Ownership", **When** a confirmation dialog appears with a type-to-confirm input, **Then** I must type the confirmation keyword (e.g., "RENOUNCE") to enable the submit button.
3. **Given** I confirm renouncement, **When** the transaction is confirmed, **Then** the ownership state changes to "renounced" and the owner shows as empty/zero address.
4. **Given** I hold a role and the adapter reports `hasRenounceRole` capability, **When** I view my role actions, **Then** I see a "Renounce Role" action.
5. **Given** I click "Renounce Role" and confirm, **When** the transaction is confirmed, **Then** my address is removed from the role's member list.

---

### User Story 7 - Cancel Admin Transfer and Manage Admin Delay (Priority: P3)

As the admin of an EVM contract with AccessControlDefaultAdminRules, I want to cancel pending admin transfers and manage the admin transfer delay so that I have full control over the admin transfer process.

**Why this priority**: These are advanced administrative operations. Less common but needed for complete admin management when the capability exists.

**Independent Test**: Can be tested by initiating an admin transfer, canceling it, and verifying the pending state is cleared. Delay management can be tested by changing the delay and verifying the new value.

**Acceptance Scenarios**:

1. **Given** a pending admin transfer exists and the adapter reports `hasCancelAdminTransfer`, **When** I view the Admin role actions, **Then** I see a "Cancel Admin Transfer" action.
2. **Given** I click "Cancel Admin Transfer" and confirm, **When** the transaction is confirmed, **Then** the pending transfer is cleared and admin state returns to "active".
3. **Given** the adapter reports `hasAdminDelayManagement`, **When** I view the Admin role details, **Then** I see the current admin delay and options to change it.
4. **Given** I initiate a delay change, **When** the transaction is confirmed, **Then** the pending delay change is scheduled (delay changes are themselves delayed).
5. **Given** a pending delay change exists, **When** I choose to rollback, **Then** the pending delay change is canceled.

---

### User Story 8 - View History on EVM Contract (Priority: P2)

As a user, I want to view the history of access control changes on an EVM contract so that I can audit who made what changes and when.

**Why this priority**: History provides audit capability but depends on the indexer. Core functionality works without it.

**Independent Test**: Can be tested by viewing the Role Changes page for a contract that has historical events indexed.

**Acceptance Scenarios**:

1. **Given** the access control indexer is available, **When** I navigate to the Role Changes page, **Then** I see a paginated list of historical events (grants, revokes, transfers, renouncements, cancellations).
2. **Given** the access control indexer is not available, **When** I navigate to the Role Changes page, **Then** I see a message indicating history is unavailable (graceful degradation).
3. **Given** history entries exist, **When** I filter by role or account, **Then** the list updates to show only matching entries.

---

### Edge Cases

#### Contract Loading

- What happens when the contract is not verified? → Display "Contract not verified" error; suggest the user verify the contract on Etherscan or use a future manual ABI entry feature.
- What happens when the contract is a proxy with unverified implementation? → Show error indicating the implementation is not verified.
- What happens when both Etherscan and Sourcify are unreachable? → Show network error with retry option.
- What happens when the contract address doesn't exist on the selected network? → `loadContract` fails; show "Contract not found" error.

#### Contract Loading (continued)

- What happens when `adapter.loadContractWithMetadata()` times out (slow Etherscan response)? → The adapter has an internal timeout budget (~10s). If exceeded, it throws a timeout error. The UI shows a network error with a retry option.
- What happens when the Etherscan API key is missing or invalid? → The adapter's provider chain falls back: Etherscan V2 → V1 → Sourcify. If all fail, the adapter throws. The UI surfaces the error. Missing API key degrades Etherscan responses but Sourcify may still work.
- What happens when a proxy contract is upgraded after initial registration? → The registered schema becomes stale. Out of scope for this iteration — the user would need to re-add the contract to pick up the new implementation ABI. Future enhancement: detect implementation changes and prompt re-registration.
- How is the contract schema (ABI JSON) persisted? → The schema is held in-memory by the adapter after `registerContract()`. It is NOT separately persisted to IndexedDB. The contract address and network are persisted via `RecentContractsStorage` for the saved contracts list. On app reload, the schema is re-fetched.

#### Role Display

- What if the adapter's ABI discovery finds no role constant functions? → Fall back to well-known dictionary; unmatched hashes display as truncated hex with copy.
- What if `RoleIdentifier.label` is populated? → Display the label directly; no truncation needed.
- What if `RoleIdentifier.label` is undefined? → Display truncated bytes32 hash (e.g., `0x9f2df0...`) with copy-to-clipboard.

#### Wallet & Network

- What happens when the wallet is on the wrong chain? → Prompt chain switch via wagmi; operations blocked until chains match.
- What happens if chain switch is rejected? → Show error; operations cannot proceed until chains match.
- What happens when the wallet disconnects mid-operation? → Show "Wallet disconnected" error; preserve form state.

#### Indexer Availability

- What happens when the indexer is unavailable for enriched roles? → Fall back to on-chain enumeration; no grant timestamps shown.
- What happens when the indexer is unavailable for history? → Show "History unavailable" message; all other operations still work.
- What happens when the indexer is available but returns empty results? → Display empty state; not an error.

#### Renounce Operations

- What happens when a user renounces ownership and there's no one to take over? → Show the FR-027 canonical warning: _"This action permanently removes the owner. The contract will have no owner and ownership cannot be restored."_
- What happens when a user renounces the last admin role? → Show strong warning: _"This will permanently remove your DEFAULT_ADMIN_ROLE role. You will not be able to regain this role unless re-granted by an admin. The contract may become unmanageable."_
- What happens when renounce is called by someone who is not the owner/role holder? → On-chain validation rejects the transaction; show appropriate error.
- What happens when a user renounces ownership while a pending transfer exists? → The on-chain contract allows this — renounce succeeds and the pending transfer becomes invalid (no owner to accept it from). The UI should refresh both ownership and pending transfer state after the renounce completes.
- What happens when a user holds multiple roles and renounces one? → Only the renounced role is affected. React Query invalidation refreshes all role lists, so the remaining roles continue to display correctly.

#### Admin Delay Management

- What happens when a delay change is already pending? → Show current pending change; offer rollback option.
- What does "delay change is itself delayed" mean for the UI? → Display both current delay and pending new delay with the schedule timestamp.

#### Ecosystem Switching

- What happens to wallet connection when switching from EVM to Stellar? → Previous wallet disconnects; user must reconnect in the new ecosystem. This is expected.
- What happens to in-progress dialogs when switching ecosystems? → Dialogs should close; any unsaved form state is lost. Transactions already submitted continue on-chain regardless.
- What happens when switching back to a previously visited ecosystem? → Adapter instance is reused (singleton). Wallet must be reconnected manually. Contract data is refetched via React Query (may be cached).
- What happens if the new ecosystem adapter fails to load? → Show error; keep the user on the previous ecosystem. Do not leave the app in a broken state.
- What happens to in-flight React Query fetches when ecosystem switches mid-request? → Stale queries from the previous adapter are ignored by React Query when the adapter/contract context changes. No special cancellation logic needed.

#### Expiration Handling

- What happens with EVM Ownable2Step transfers (no expiration)? → No expiration input shown; transfer is accepted via `acceptOwnership` with no time limit.
- What happens with EVM AccessControlDefaultAdminRules transfers? → The delay is configured on the contract; no user-specified expiration. The UI shows when the transfer becomes acceptable.
- How does this differ from Stellar? → Stellar requires user-specified expiration ledger number; EVM uses contract-configured delays. The adapter abstracts this difference.
- What happens when `getExpirationMetadata` is not implemented (older adapter version)? → Fall back to existing behavior: check `hasTwoStepOwnable` / `hasTwoStepAdmin` capability flags to decide if expiration input is shown, using the current hardcoded label. This preserves backward compatibility while older adapters are in use.
- What happens when a contract implements BOTH Ownable2Step AND AccessControlDefaultAdminRules? → Both Owner and Admin synthetic roles are displayed simultaneously (existing behavior from specs 015 + 016). Ownership transfer has no expiration; admin transfer has delay-based scheduling. The `getExpirationMetadata` method is called per-transfer-type, so each dialog gets the correct behavior.

#### Transaction Errors

- What happens when a transaction fails due to insufficient gas? → The adapter surfaces this via `onStatusChange` as a failed transaction status. The existing error classification in `utils/errors.ts` handles gas-related errors and displays a user-friendly message.

#### Non-Functional

- ABI auto-fetch timeout: The adapter has an internal ~10s timeout budget. The UI must show a loading state during fetch. No explicit performance SLA beyond the adapter's budget.
- Ecosystem switching performance: Switching is near-instantaneous (React key change + adapter singleton reuse). No measurable threshold specified — the infrastructure handles this.
- Accessibility: The `TypeToConfirmDialog` and `RoleHashDisplay` components use `@openzeppelin/ui-components` primitives (Dialog, Button, Input) which have built-in keyboard navigation, focus management, and ARIA attributes. No additional accessibility requirements beyond those provided by the design system.
- Analytics: New operations (renounce, cancel admin transfer, change admin delay, rollback admin delay) SHOULD emit tracking events via `useRoleManagerAnalytics` following the same pattern as existing operations (grantRole, revokeRole, etc.).

## Requirements _(mandatory)_

### Functional Requirements

#### Ecosystem Activation

- **FR-001**: System MUST enable the EVM ecosystem in the registry by setting `defaultFeatureConfig.enabled: true` and removing `disabledLabel`.
- **FR-002**: System MUST display EVM as a selectable ecosystem in the Add Contract dialog's `CompactEcosystemSelector` alongside Stellar.
- **FR-003**: System MUST load EVM networks from the EVM adapter package via the existing `ecosystemManager` pattern.

#### EVM Wallet Connection

- **FR-004**: System MUST use the EVM adapter's **wagmi custom UI kit** for wallet connection (`EvmWalletUiRoot` provider component).
- **FR-005**: System MUST integrate the adapter's wallet components via `adapter.getEcosystemReactUiContextProvider()` and `adapter.getEcosystemWalletComponents()`.
- **FR-006**: System MUST support chain switching when the connected wallet is on a different chain than the selected network (handled by wagmi).
- **FR-007**: System MUST display the connected EVM wallet address in the application header, consistent with the Stellar wallet display pattern.

#### Seamless Ecosystem Switching

- **FR-007a**: Switching between ecosystems (EVM ↔ Stellar) MUST be seamless — no page reloads, no white flashes, no loss of app state (selected contract, navigation position).
- **FR-007b**: System MUST use the existing `WalletStateProvider` single-provider pattern: only one ecosystem provider mounted at a time, swapped via React `key` prop.
- **FR-007c**: During ecosystem transition, system MUST retain the previous ecosystem provider until the new adapter is loaded and UI kit configured (flicker prevention).
- **FR-007d**: `AdapterProvider` MUST maintain adapter singletons — switching back to a previously visited ecosystem MUST reuse the existing adapter instance, not re-initialize.
- **FR-007e**: Wallet connections are per-ecosystem — switching ecosystems disconnects the previous wallet. This is expected behavior and MUST NOT be treated as an error. Switching back to a previously visited ecosystem does NOT auto-reconnect the wallet; the user must reconnect manually.
- **FR-007f**: Ecosystem switching MUST happen automatically when the user selects a saved contract from a different ecosystem/network — via `selectContractById` → `setSelectedNetwork` → `WalletSyncProvider` → wallet provider swap. No manual ecosystem selection is required after the initial contract addition.
- **FR-007g**: The `WalletStateProvider` key prop and flicker prevention are handled by the upstream `@openzeppelin/ui-react` package. The Role Manager's `WalletSyncProvider` calls `setActiveNetworkId(newNetworkId)` and sets `isAdapterReady` to manage the transition lifecycle. No custom key prop logic is needed in the Role Manager.
- **FR-007h**: In-flight React Query fetches from the previous ecosystem are stale after an ecosystem switch. React Query handles this gracefully — stale queries are ignored when the adapter/contract context changes. No special cancellation logic is needed.

#### EVM Configuration

- **FR-008**: System MUST use `public/app.config.json` for EVM service configuration, following the UI Builder's `AppConfigService` pattern. Required entries: `globalServiceConfigs.walletconnect.projectId` (WalletConnect project ID) and `globalServiceConfigs.walletui.evm.kitName: "custom"` (wallet UI kit selection).
- **FR-009**: Etherscan V2 API key MUST be configured via `.env.local` environment variable `VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY`, consistent with the UI Builder's pattern.
- **FR-010**: The adapter MUST read all credentials internally via `AppConfigService` — the Role Manager does not pass keys directly.

#### Contract Loading (Verified Contracts)

- **FR-011**: System MUST use `adapter.loadContractWithMetadata(address)` to automatically fetch the ABI from Etherscan/Sourcify for verified contracts. This method returns `{ schema, source, metadata?, proxyInfo? }`. The existing `useContractSchemaLoader` hook already calls this method.
- **FR-012**: System MUST handle unverified contracts by displaying a clear "Contract not verified" error. The adapter throws when a contract is not verified on any supported source; the UI surfaces this error.
- **FR-013**: System MUST support proxy contract detection — the adapter returns `proxyInfo` when a proxy is detected, and the `schema` contains the implementation ABI.
- **FR-014**: System MUST call `service.registerContract(address, schema)` with the fetched schema to enable feature detection. The schema is held in-memory by the adapter after registration; it is NOT separately persisted to IndexedDB. The contract address and network are persisted via `RecentContractsStorage`.
- **FR-015**: System MUST display detected capabilities after registration (Ownable, Ownable2Step, AccessControl, AccessControlEnumerable, AccessControlDefaultAdminRules).

#### Role Display & Management

- **FR-016**: System MUST display role assignments using the same Roles page patterns as Stellar (role list, member list, details panel).
- **FR-017**: System MUST display the `RoleIdentifier.label` when provided by the adapter (pre-resolved via well-known dictionary, ABI discovery, or external labels).
- **FR-018**: System MUST display a truncated bytes32 hash with copy-to-clipboard when `RoleIdentifier.label` is not available.
- **FR-019**: System MUST use `getCurrentRolesEnriched()` when the indexer is available, falling back to `getCurrentRoles()` without error.
- **FR-020**: System MUST support `grantRole` and `revokeRole` operations using the existing Role Manager mutation hooks and dialog patterns.
- **FR-021**: EVM address validation MUST use the adapter's `isValidAddress()` method.

#### Ownership Operations

- **FR-022**: System MUST display synthesized Owner role when `capabilities.hasOwnable` is true (existing pattern).
- **FR-023**: System MUST support two-step ownership transfer for Ownable2Step contracts (`hasTwoStepOwnable` capability) — note: EVM Ownable2Step has **no expiration**, so no expiration input is shown.
- **FR-024**: For single-step Ownable contracts (no Ownable2Step), system MUST support direct `transferOwnership` without acceptance step.

#### Renounce Operations (Chain-Agnostic)

- **FR-025**: When the adapter reports `hasRenounceOwnership` capability, system MUST display a "Renounce Ownership" action on the Owner role.
- **FR-026**: When the adapter reports `hasRenounceRole` capability, system MUST display a "Renounce Role" action on roles held by the connected wallet.
- **FR-027**: Renounce actions MUST show a confirmation dialog using a **type-to-confirm** pattern with the following precise behavior:
  - Confirmation keyword: `"RENOUNCE"` (final, case-sensitive, exact match required).
  - Submit button: disabled by default; enabled ONLY when the input matches the keyword exactly.
  - Warning text: each renounce operation MUST include a contextual irreversibility warning. For ownership: _"This action permanently removes the owner. The contract will have no owner and ownership cannot be restored."_ For role: _"This will permanently remove your [ROLE_NAME] role. You will not be able to regain this role unless re-granted by an admin."_
  - On failure: the dialog remains open with an error message. The confirmation input is preserved — the user can retry without retyping.
- **FR-028**: `renounceRole` MUST call `service.renounceRole(contractAddress, roleId, account, executionConfig)` — the `account` parameter is the connected wallet's own address (self-revocation only; renouncing another account's role is not supported).
- **FR-029**: After successful renounce, system MUST invalidate and refetch the affected data (ownership state or role assignments).

#### Admin Operations

- **FR-030**: System MUST display synthesized Admin role when `capabilities.hasTwoStepAdmin` is true (spec 016 pattern).
- **FR-031**: System MUST support admin transfer via `transferAdminRole` and `acceptAdminTransfer` following the spec 016 patterns.
- **FR-032**: When the adapter reports `hasCancelAdminTransfer` capability and a pending transfer exists, system MUST display a "Cancel Admin Transfer" action.
- **FR-033**: When the adapter reports `hasAdminDelayManagement` capability, system MUST display the current admin delay and actions to change or rollback the delay. The `AdminDelayPanel` MUST present: (1) current delay formatted as a human-readable duration (e.g., "2 days 4 hours"), (2) if a pending delay change exists: the new delay value, the "effective at" date/time (formatted from `delayInfo.pendingDelay.effectAt`), and a "Rollback" action button, (3) if no pending change: a "Change Delay" action button that opens a dialog with the numeric + unit input per FR-035.
- **FR-034**: `cancelAdminTransfer` MUST call `service.cancelAdminTransfer(contractAddress, executionConfig)`.
- **FR-035**: `changeAdminDelay` MUST call `service.changeAdminDelay(contractAddress, newDelay, executionConfig)` with a user-specified delay value. The `newDelay` parameter is in **seconds** (matching the EVM contract's `AccessControlDefaultAdminRules` interface). The UI MUST present a **numeric input with a unit selector** (days, hours, minutes) and convert the value to seconds before submission. Display format: "X days Y hours" (omit zero components). Example: user enters "2" + "days" → `newDelay = 172800`. The input MUST reject non-positive values.
- **FR-036**: `rollbackAdminDelay` MUST call `service.rollbackAdminDelay(contractAddress, executionConfig)` when a pending delay change exists.

#### Chain-Agnostic Expiration Handling

- **FR-037**: System MUST NOT hardcode "ledger", "block", or "timestamp" as expiration labels. All expiration terminology MUST be derived from adapter-provided metadata.
- **FR-038**: The transfer dialogs (ownership, admin) MUST conditionally show or hide the expiration input based on whether the adapter's expiration metadata indicates it is required.
- **FR-039**: When expiration is required (e.g., Stellar), the dialog MUST show the appropriate label and polling display as provided by the adapter.
- **FR-040**: When no expiration is applicable (e.g., EVM Ownable2Step), the dialog MUST omit the expiration input entirely.
- **FR-041**: When the expiration is contract-managed (e.g., EVM AccessControlDefaultAdminRules delay), the dialog MUST display the accept schedule as a **human-readable date/time** (formatted from the UNIX timestamp in `ExpirationMetadata.currentValue`) for informational purposes without requiring user input. If the accept schedule is in the past, display "Immediately acceptable".

#### History & Audit

- **FR-042**: System MUST display role change history when the access control indexer is available.
- **FR-043**: History MUST include EVM-specific event types when present: `OWNERSHIP_RENOUNCED`, `ADMIN_RENOUNCED`, `ADMIN_TRANSFER_CANCELED`, `ADMIN_DELAY_CHANGE_SCHEDULED` (these are already defined in `HistoryChangeType` in ui-types).
- **FR-044**: System MUST handle missing indexer gracefully — history page shows "unavailable" message; all other operations remain functional.

#### Transaction Execution

- **FR-045**: System MUST execute EVM transactions through the adapter's transaction execution mechanism (wagmi wallet client internally).
- **FR-046**: System MUST display transaction status updates consistent with existing patterns (idle → signing → submitting → confirming → confirmed).
- **FR-047**: System MUST support `ExecutionConfig` with `method: 'eoa'` for direct wallet transactions.

#### Graceful Degradation

- **FR-048**: When the access control indexer is unavailable, system MUST fall back to on-chain data for role enumeration (using `AccessControlEnumerable` if available).
- **FR-049**: When a contract does not implement `AccessControlEnumerable` and the indexer is unavailable, system MUST display an informational message: _"This contract does not support role enumeration. Role member information requires either an enumerable interface (AccessControlEnumerable) or an access control indexer, neither of which is available for this contract."_ The message MUST be non-blocking (informational banner, not an error dialog) and MUST NOT prevent other operations (ownership, admin) from functioning.
- **FR-050**: When `getAdminInfo()` is not available or throws, Admin role MUST NOT be displayed (no error shown).
- **FR-051**: When new optional methods (`renounceOwnership`, `renounceRole`, etc.) are not available on the service, the corresponding UI actions MUST NOT be displayed.

### Key Entities

- **ContractSchema (EVM)**: The ABI JSON fetched automatically from Etherscan/Sourcify for verified contracts; used for feature detection and transaction assembly.
- **EvmNetworkConfig**: Network configuration including RPC URL, chain ID, and optional `accessControlIndexerUrl`.
- **RoleIdentifier**: A `{ id: string, label?: string }` where `id` is a bytes32 hash and `label` is pre-resolved by the adapter (well-known dictionary → ABI discovery → external labels).
- **ExpirationMetadata**: Chain-agnostic expiration description provided by the adapter, indicating whether expiration is required, its type (ledger/block/timestamp/none), and the display label. (New type to be defined in ui-types.)
- **AccessControlCapabilities (extended)**: Existing type with new optional flags: `hasRenounceOwnership`, `hasRenounceRole`, `hasCancelAdminTransfer`, `hasAdminDelayManagement`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

#### Ecosystem Activation

- **SC-001**: Users can select EVM as an ecosystem in the Add Contract dialog and see available EVM networks.
- **SC-002**: Users can connect an EVM wallet via the adapter's custom UI kit and see their address displayed in the header.
- **SC-003**: Chain switching works when the wallet is on a different chain than the selected network.

#### Contract Loading

- **SC-004**: Users can add a verified EVM contract by providing only its address — ABI is auto-fetched.
- **SC-005**: Capability detection correctly identifies Ownable, Ownable2Step, AccessControl, AccessControlEnumerable, and AccessControlDefaultAdminRules from the fetched ABI.
- **SC-006**: Unverified contracts produce a clear "Contract not verified" error.
- **SC-007**: Proxy contracts are detected and the implementation ABI is fetched automatically.

#### Read Operations

- **SC-008**: Role assignments display correctly for AccessControlEnumerable contracts with resolved labels.
- **SC-009**: Owner and Admin synthetic roles display correctly when capabilities are detected.
- **SC-010**: Enriched role data (grant timestamps) displays when the indexer is available.
- **SC-011**: All read operations work without the indexer (graceful degradation).

#### Write Operations

- **SC-012**: Grant role completes successfully with correct transaction status flow.
- **SC-013**: Revoke role completes successfully with correct transaction status flow.
- **SC-014**: Two-step ownership transfer (initiate + accept) completes successfully.
- **SC-015**: Admin transfer (initiate + accept) completes successfully for AccessControlDefaultAdminRules contracts.

#### Renounce & Cancel Operations

- **SC-016**: Renounce ownership action appears only when `hasRenounceOwnership` capability is true; executes correctly.
- **SC-017**: Renounce role action appears only when `hasRenounceRole` capability is true; executes correctly.
- **SC-018**: Cancel admin transfer action appears only when `hasCancelAdminTransfer` capability is true and a pending transfer exists.
- **SC-019**: Admin delay management actions appear only when `hasAdminDelayManagement` capability is true. Current delay, pending delay change, and schedule timestamp are correctly displayed in the `AdminDelayPanel`.

#### History

- **SC-020**: Role change history displays with pagination when the indexer is available, including EVM-specific event types (renounce, cancel, delay change).
- **SC-021**: History page shows appropriate message when the indexer is unavailable.

#### Cross-Ecosystem Consistency

- **SC-022**: EVM and Stellar contracts can be managed in the same session by switching ecosystems — switching is seamless with no page reloads (no browser location change), no white flashes (no unmounted-then-mounted blank screen), and app state (selected contract, navigation position) preserved across provider swaps.
- **SC-023**: Expiration terminology is adapter-driven — no hardcoded "ledger" or "block" labels anywhere in the UI. Verification method: `grep -rn "expiration ledger\|Expiration Ledger\|expirationBlock" --include="*.tsx" --include="*.ts" src/` returns zero matches in display strings (type field names and adapter types are excluded).
- **SC-024**: All existing Stellar functionality continues to work without regression.
- **SC-025**: New operations (renounce, cancel, delay) work chain-agnostically — they appear/disappear based on capability flags, not ecosystem identity.

## Assumptions

- The EVM adapter package (`@openzeppelin/ui-builder-adapter-evm`) exports `EvmAdapter` class implementing `ContractAdapter` and `evmNetworks` array of `NetworkConfig`.
- The `EvmAdapter.getAccessControlService()` returns an `EvmAccessControlService` instance implementing the full `AccessControlService` interface (including the new optional methods after ui-types update).
- The `EvmAdapter` exposes `getEcosystemReactUiContextProvider()` returning `EvmWalletUiRoot` and `getEcosystemWalletComponents()` returning `EcosystemWalletComponents | undefined`. **[Verified against adapter source]**
- Transaction execution is handled internally by the adapter via wagmi — the adapter creates its own `EvmTransactionExecutor` callback that wraps `signAndBroadcast()`. The Role Manager does not need to wire this manually. **[Verified against adapter source]**
- `adapter.loadContractWithMetadata(address)` fetches verified ABIs from Etherscan/Sourcify automatically; returns `{ schema, source, metadata?, proxyInfo? }`. The existing `useContractSchemaLoader` already calls this method. **[Verified against adapter source and Role Manager code]**
- EVM network configurations include RPC URLs and chain IDs; the `accessControlIndexerUrl` is optional.
- The Role Manager's `public/app.config.json` will include `globalServiceConfigs` entries for `walletconnect` (project ID), `walletui` (kit config), and optionally `etherscanv2` (API key). The Etherscan V2 API key is also configurable via `.env.local` as `VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY`, following the UI Builder pattern. The adapter reads these via `AppConfigService` internally.
- The prerequisite ui-types changes (new optional methods, new capability flags, chain-agnostic expiration metadata) will be released as a new version of `@openzeppelin/ui-types` before this feature branch begins. This is a hard dependency — no stub/mock approach.
- Both the EVM and Stellar adapters will ship updated versions conforming to the extended interface before this feature branch begins.
- The existing ecosystem-agnostic hooks (`useContractRoles`, `useContractOwnership`, `useContractAdminInfo`, etc.) will work with the EVM adapter without modification for core operations. New hooks will be needed for renounce, cancel, and delay management operations.
- Role labels are pre-resolved by the adapter and arrive in `RoleIdentifier.label` — the Role Manager does not need to resolve labels itself. **[Verified: `resolveRoleLabel()` populates `RoleIdentifier.label` from well-known dictionary + ABI discovery + external labels]**
- The `useCurrentBlock` hook and `BlockTimeContext` are chain-agnostic — they use `adapter.getCurrentBlock()` which works for both EVM and Stellar. No adaptation needed. **[Verified against Role Manager code]**
- The `WalletSyncProvider` already handles EVM chain switching via `NetworkSwitchManager`. The key prop and flicker prevention are managed by the upstream `WalletStateProvider` from `@openzeppelin/ui-react`. **[Verified against Role Manager code]**
- The Authorized Accounts page (`useAuthorizedAccountsPageData`) and Dashboard (`useDashboardData`) are fully ecosystem-agnostic — they work via adapter hooks without ecosystem-specific branching. They are automatically in scope for EVM. **[Verified against Role Manager code]**
- The `config/wallet/rainbowkit.config.ts` file is actively used by `WalletStateProvider` via dynamic loading when `kitName` is `'rainbowkit'`. Since we use `kitName: 'custom'`, it is not loaded for our configuration but provides flexibility for other kit choices. It should be LEFT AS-IS — not removed.
- The "Renounce Role" action appears in `AccountRow` (per-account context), not in `RoleDetails` (per-role). Self-renunciation is only meaningful when viewing your own account's role, so the action button sits next to the connected wallet's address in the role members list.
