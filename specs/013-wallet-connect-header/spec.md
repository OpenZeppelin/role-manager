# Feature Specification: Wallet Connect Header Module

**Feature Branch**: `013-wallet-connect-header`  
**Created**: 2025-12-10  
**Status**: Draft  
**Input**: User description: "add Wallet Connect module to the header. Use the established UI Builder adapters implementation. Take the UI Builders main app as an example on how to use it and how to handle ecosystems and network switching."

## Clarifications

### Session 2025-12-10

- Q: Should the wallet connection button be available in the header at all times, or only when a contract is selected? → A: Only visible when a **network** is selected from the ecosystem picker in the sidebar — because the network determines the ecosystem (via `selectedNetwork.ecosystem`), which tells us which wallet adapter implementation to use. The contract selection is independent from wallet connection availability.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect Wallet from Header (Priority: P1)

A user visiting the Role Manager application wants to connect their cryptocurrency wallet to interact with contracts. They see a "Connect Wallet" button in the application header and can initiate the wallet connection flow directly from there.

**Why this priority**: Wallet connection is the fundamental capability that enables all user interactions with contracts. Without a connected wallet, users cannot perform any write operations or authenticate their identity.

**Independent Test**: Can be fully tested by clicking the "Connect Wallet" button in the header, selecting a wallet provider (e.g., MetaMask, WalletConnect), and completing the connection flow. Delivers core value of enabling wallet-based interactions.

**Acceptance Scenarios**:

1. **Given** a user is on any page with a network selected from the ecosystem picker and no wallet connected, **When** they click the "Connect Wallet" button in the header, **Then** a wallet selection modal appears showing wallet providers compatible with the selected network's ecosystem
2. **Given** a user has clicked the Connect Wallet button and selected a provider, **When** they complete the authentication in their wallet, **Then** the header displays their connected wallet address and the connection status changes to "connected"
3. **Given** a user's wallet connection attempt fails, **When** the error is returned, **Then** the user sees a clear error message and can retry the connection

---

### User Story 2 - View Connected Wallet Status (Priority: P1)

A user who has connected their wallet wants to see their connection status, wallet address, and currently connected network at a glance in the header without navigating to a settings page.

**Why this priority**: Real-time visibility of wallet status is critical for user confidence and awareness. Users must always know which wallet and network they're operating on to avoid costly mistakes.

**Independent Test**: Can be tested by connecting a wallet and verifying the header displays the truncated address, network indicator, and any relevant status icons.

**Acceptance Scenarios**:

1. **Given** a user has a connected wallet, **When** they view the application header, **Then** they see their truncated wallet address (e.g., "0x1234...5678")
2. **Given** a user has a connected wallet on a specific network, **When** they view the header, **Then** they see the current network name or indicator
3. **Given** a user has a connected wallet, **When** the connection is active, **Then** a visual indicator shows the "connected" status

---

### User Story 3 - Disconnect Wallet from Header (Priority: P2)

A user who has connected their wallet wants to disconnect it directly from the header when they're done using the application or want to switch to a different wallet.

**Why this priority**: Disconnection capability is important for security and privacy but is a secondary action after the primary connect/view flows are established.

**Independent Test**: Can be tested by connecting a wallet, accessing the disconnect option from the header's wallet menu, and verifying the wallet disconnects and the UI resets to the "Connect Wallet" state.

**Acceptance Scenarios**:

1. **Given** a user has a connected wallet, **When** they click on their wallet address or account menu in the header, **Then** they see an option to disconnect
2. **Given** a user clicks the disconnect option, **When** the disconnection completes, **Then** the header returns to showing the "Connect Wallet" button
3. **Given** a user has disconnected their wallet, **When** they view the application, **Then** any wallet-dependent features indicate the need to reconnect

---

### User Story 4 - Support Multiple Ecosystem Wallets (Priority: P3)

A user wants to connect wallets from different blockchain ecosystems (Stellar as primary, EVM chains for future expansion) supported by the Role Manager application.

**Why this priority**: Multi-ecosystem support extends the application's utility. Stellar is the primary focus; EVM support ensures future expandability once Stellar wallet connection is solid.

**Independent Test**: Can be tested by attempting to connect wallets from different ecosystems and verifying each ecosystem's wallet providers are available and functional.

**Acceptance Scenarios**:

1. **Given** a user is connecting a wallet, **When** the selected network is on Stellar (primary focus), **Then** Stellar-compatible wallet options are displayed (Freighter, Albedo, xBull, etc. via Stellar Wallets Kit)
2. **Given** a user is connecting a wallet, **When** the selected network is on an EVM chain (future expansion), **Then** EVM-compatible wallet options (MetaMask, WalletConnect, etc.) are displayed via RainbowKit
3. **Given** a user switches networks to a different ecosystem via the ecosystem picker, **When** a wallet from a different ecosystem is needed, **Then** the appropriate wallet connection options for that ecosystem are presented

---

### Edge Cases

- What happens when no network is selected? The wallet connection UI is not displayed in the header; the header shows only the application title and navigation. Users must first select a network from the ecosystem picker to enable wallet connection.
- What happens when the user's browser extension wallet is locked? The connection attempt will use the wallet provider's default timeout behavior (typically 30-60 seconds depending on wallet). The adapter surfaces the raw timeout error from the wallet provider.
- What happens if the user rejects the connection request in their wallet? The UI returns to the disconnected state with a message indicating the connection was cancelled.
- How does the system handle wallet disconnection initiated from the wallet extension itself? The application detects the disconnection event and updates the UI accordingly.
- What happens during adapter initialization/loading? A skeleton loader is displayed in the header where the wallet UI would appear, indicating the wallet functionality is loading.
- What happens when switching networks to a different ecosystem? The current wallet is disconnected, the new ecosystem's adapter is loaded (with loading skeleton), and the user must reconnect with a wallet compatible with the new ecosystem.

### Error Handling

Error messages are provided by the UI Builder adapter hooks as-is from wallet providers:

- `useDerivedConnectStatus().error` — connection errors
- `useDerivedDisconnect().error` — disconnection errors

Raw wallet provider errors are displayed without custom formatting.

## Requirements _(mandatory)_

### Functional Requirements

#### Role Manager Implementation Required

- **FR-001**: System MUST display a wallet connection button in the application header when no wallet is connected AND a network is selected from the ecosystem picker (wallet UI is hidden until network selection determines the ecosystem via `selectedNetwork.ecosystem`) — _requires `WalletHeaderSection` wrapper_
- **FR-002**: System MUST integrate with the UI Builder's adapter architecture (`AdapterProvider`, `WalletStateProvider`) for wallet management — _requires `WalletSyncProvider` to bridge `ContractContext` (specifically `selectedNetwork`)_

#### Provided by UI Builder Adapters (No Implementation Required)

- **FR-003**: System MUST display the connected wallet's truncated address in the header when a wallet is connected — _provided by `CustomAccountDisplay` using `truncateMiddle(4, 4)`_
- **FR-004**: System MUST display the current ecosystem indicator when a wallet is connected — _provided by `CustomAccountDisplay` ("Stellar Account" / "Chain ID: X")_
- **FR-005**: System MUST handle wallet connection state changes reactively (connect, disconnect) — _provided by `useDerivedAccountStatus`, `useDerivedConnectStatus` hooks_
- **FR-006**: System MUST support Stellar wallets through the existing adapter-stellar package (primary focus: Freighter, Albedo, xBull) — _provided by `adapter-stellar`_
- **FR-007**: System MUST support EVM-compatible wallets through the existing adapter-evm package (future expansion) — _provided by `adapter-evm`_
- **FR-008**: System MUST support appropriate UI kits for each ecosystem (Stellar Wallets Kit for Stellar, RainbowKit for EVM) — _provided by adapter `configureUiKit` methods_
- **FR-009**: Users MUST be able to disconnect their wallet from the header — _provided by `CustomAccountDisplay` disconnect button_
- **FR-010**: System MUST handle connection errors gracefully — _provided by hooks (`error` property); raw wallet provider errors displayed as-is_
- **FR-011**: System MUST persist wallet connection state appropriately (reconnect on page refresh where supported) — _provided by underlying wallet libraries (wagmi, StellarWalletsKit)_

### Key Entities _(include if feature involves data)_

- **Wallet Connection State**: Represents the current connection status including isConnected, address, chainId, and connector information
- **Network Configuration**: Represents blockchain network details including network ID, name, ecosystem type, and chain-specific parameters
- **Contract Adapter**: Represents the ecosystem-specific adapter instance that handles wallet operations for a given blockchain

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can connect a wallet within 3 clicks from any page in the application (network selected → connect button → wallet selection → connected)
- **SC-002**: Wallet connection status is visually updated within 1 second of connection state changes (verified via manual observation during quickstart testing)
- **SC-003**: Wallet connection flow completes without errors for supported wallet providers when user approves connection (excluding user-cancelled or wallet-locked scenarios)
- **SC-004**: Disconnecting wallet resets UI to "Connect Wallet" state without stale data (verified by checking header displays connect button and no address persists)
- **SC-005**: Wallet components render correctly on Chrome, Firefox, Safari, and Edge (latest versions); responsive down to 768px viewport width

### Browser Support Matrix

| Browser | Version | Status    |
| ------- | ------- | --------- |
| Chrome  | Latest  | Primary   |
| Firefox | Latest  | Supported |
| Safari  | Latest  | Supported |
| Edge    | Latest  | Supported |

### Responsive Breakpoints

- **Desktop**: ≥1024px - Full header with wallet UI
- **Tablet**: 768px-1023px - Condensed header, wallet UI visible
- **Mobile**: <768px - Wallet UI in mobile menu (future consideration)

## Assumptions

- The existing UI Builder adapter packages (`adapter-stellar`, `adapter-evm`) provide complete wallet connection functionality
- **Stellar is the primary focus**: Stellar Wallets Kit will be used for Stellar networks (supports Freighter, Albedo, xBull, etc.)
- EVM support (RainbowKit, WalletConnect) is included for future expansion
- The `@openzeppelin/ui-builder-react-core` package will be added as a dependency to provide `WalletStateProvider` and related hooks
- Each ecosystem has its own UI kit configuration (Stellar Wallets Kit config, RainbowKit config)
- The header's `rightContent` area has sufficient space for wallet connection UI components
- Users are familiar with basic cryptocurrency wallet operations (Stellar or EVM depending on contract)

---

## Adapter Capability Analysis

### Already Provided by UI Builder Packages

The following functionality is **already implemented** in the UI Builder adapter packages and requires NO additional development:

| Requirement                | Provider          | Component/Hook                                       | Notes                                      |
| -------------------------- | ----------------- | ---------------------------------------------------- | ------------------------------------------ |
| FR-003 (Truncated address) | `adapter-*`       | `CustomAccountDisplay`                               | Uses `truncateMiddle(4, 4)` format         |
| FR-004 (Ecosystem label)   | `adapter-*`       | `CustomAccountDisplay`                               | Shows "Stellar Account" / "Chain ID: X"    |
| FR-005 (Reactive state)    | `react-core`      | `useDerivedAccountStatus`, `useDerivedConnectStatus` | All state hooks provided                   |
| FR-006 (Stellar wallets)   | `adapter-stellar` | `CustomConnectButton`, `ConnectorDialog`             | Supports Freighter, Albedo, xBull          |
| FR-007 (EVM wallets)       | `adapter-evm`     | `CustomConnectButton`, `ConnectorDialog`             | Full wagmi/RainbowKit integration          |
| FR-008 (UI kits)           | `adapter-*`       | `configureUiKit` methods                             | Stellar Wallets Kit / RainbowKit           |
| FR-009 (Disconnect)        | `adapter-*`       | `CustomAccountDisplay`                               | Disconnect button in account display       |
| FR-010 (Error handling)    | `react-core`      | `useDerivedConnectStatus().error`                    | Raw wallet provider errors                 |
| FR-011 (Persistence)       | `adapter-*`       | Underlying wallet libraries                          | wagmi/StellarWalletsKit handle persistence |
| Loading skeleton           | `react-core`      | `WalletConnectionHeader`                             | Shows skeleton during `isAdapterLoading`   |

### Provided Hooks (react-core)

```typescript
// Account status
useDerivedAccountStatus(): { isConnected, address, chainId }

// Connection
useDerivedConnectStatus(): { connect, connectors, isConnecting, error }

// Disconnection
useDerivedDisconnect(): { disconnect, isDisconnecting, error }
```

### Provided Components (per adapter)

**Stellar (`adapter-stellar`)**:

- `CustomConnectButton` - Opens wallet selector dialog
- `CustomAccountDisplay` - Shows address + disconnect button + "Stellar Account" label

**EVM (`adapter-evm`)**:

- `CustomConnectButton` - Opens wallet selector dialog
- `CustomAccountDisplay` - Shows address + chain ID + disconnect button

### Gaps Requiring Role Manager Implementation

| Gap                       | Requirement | Resolution                                                                                          |
| ------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| **Conditional rendering** | FR-001      | Role Manager must implement `WalletHeaderSection` to show/hide wallet UI based on network selection |
| **Network→Adapter sync**  | FR-002      | Role Manager must implement `WalletSyncProvider` to sync `selectedNetwork` → `WalletStateProvider`  |

### Adapter Limitations (Accepted)

| Limitation                    | Resolution                                                        |
| ----------------------------- | ----------------------------------------------------------------- |
| **No network switching**      | Not needed; network is determined by ecosystem picker in sidebar  |
| **Address truncation format** | Use adapter's `truncateMiddle(4, 4)` as-is                        |
| **Error message format**      | Use raw wallet provider errors as-is                              |
| **Accessibility (a11y)**      | Out of scope; would require adapter changes for full a11y support |

---

## Out of Scope

- **Network switching from wallet** — Role Manager does not need network switching from wallet UI; network is determined by the ecosystem picker in the sidebar
- **Accessibility (a11y) enhancements** — Custom aria-labels, aria-live regions, focus management (would require adapter changes)
- **Custom error message formatting** — Use adapter-provided raw errors as-is
- Custom wallet provider implementations beyond what the UI Builder adapters support
- Hardware wallet-specific handling (supported through standard wallet connections)
- Transaction signing and broadcasting (separate feature, wallet connection is prerequisite)
- Wallet balance display
- ENS name resolution for displaying human-readable addresses
- Multi-wallet simultaneous connections
