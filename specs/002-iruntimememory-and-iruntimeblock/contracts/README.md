# Contracts: Runtime Memory-Behavior

- **Constructor contract**: Behavior constructors MUST accept runtime memory references defined by their descriptors. Enforce via TypeScript type checks and tests.
- **Allocation contract**: `IRuntimeBlock` must allocate every descriptor before behavior instantiation; failure surfaces a descriptive error.
- **Logging contract**: Allocation logs MUST include block key, behavior name, reference id.
- **Determinism contract**: Allocation order must be stable for identical inputs to ease testing.
