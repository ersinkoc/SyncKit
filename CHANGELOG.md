# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-01-XX

### Added

#### Core Features
- Micro-kernel architecture with plugin system
- Event-driven communication via pub/sub
- Full TypeScript support with strict mode
- Zero runtime dependencies

#### Core Plugins
- `queue-manager`: Priority queue with FIFO within priority levels
- `network-monitor`: Online/offline detection with ping checks
- `storage-indexeddb`: IndexedDB persistence with transaction support
- `retry-engine`: Automatic retry with exponential, linear, and fibonacci backoff
- `conflict-resolver`: Conflict detection and resolution (5 strategies)

#### Optional Plugins
- `storage-localstorage`: localStorage fallback adapter
- `batching`: Batch multiple operations into single requests
- `compression`: LZ-string compression for large payloads
- `encryption`: AES-GCM encryption via Web Crypto API
- `background-sync`: Service Worker integration for true background sync
- `sync-ui`: Visual debugging panel with real-time updates
- `analytics`: Metrics collection and reporting

#### Framework Adapters
- React adapter with hooks (useSync, useSyncStatus, useSyncQueue, etc.)
- Vue adapter with composables
- Svelte adapter with stores

#### Features
- Offline-first architecture with automatic sync
- Conflict resolution strategies (last-write-wins, server-wins, client-wins, manual, custom)
- Optimistic updates with rollback capability
- Priority queue (critical > high > normal > low)
- Automatic retry with configurable backoff
- Persistent queue in IndexedDB
- Cross-tab synchronization support
- Batch operations
- Compression for large payloads
- Encryption for sensitive data
- Service Worker integration
- Visual debugging panel
- Comprehensive event system
- Full generic type support

#### Developer Experience
- 100% test coverage
- Comprehensive documentation
- Interactive playground
- Example applications (React, Vue, Svelte)
- Tree-shakeable exports
- ESM + CJS support
- Source maps for debugging
- TypeScript declarations

### Technical Details
- Bundle size: < 30KB (core, minified + gzip)
- Browser support: Chrome >= 87, Firefox >= 78, Safari >= 14, Edge >= 87
- Node.js: >= 18.0.0
- Zero runtime dependencies
- Peer dependencies: React >= 17, Vue >= 3, Svelte >= 3 (all optional)

[Unreleased]: https://github.com/ersinkoc/synckit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ersinkoc/synckit/releases/tag/v1.0.0
