# Vendor model wiring

This branch adds the Prisma model fragment for vendor marketplace persistence.

Use `prisma/vendor-models.prisma` as the source of truth for the next schema merge.

Next steps:

1. Merge the model fragment into `prisma/schema.prisma`.
2. Generate a Prisma migration.
3. Regenerate Prisma client.
4. Wire `VendorRepository` and `QuoteRepository` into `VendorsModule`.
5. Replace in-memory vendor storage with durable storage.
