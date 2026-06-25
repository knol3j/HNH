# Vendor Marketplace

The vendor marketplace module is the entry point for compute buyers.

## Initial scope

- vendor registration scaffold
- compute price quote endpoint
- GPU and time pricing model
- platform fee calculation
- estimated worker payout calculation

## Endpoints

- `POST /vendors`
- `GET /vendors`
- `POST /vendors/price-quote`

Write operations require vendor or admin role and signed requests.

## Pricing model

The first pricing model is intentionally simple:

- subtotal uses hourly GPU rate, GPU count, estimated hours, and priority multiplier
- platform fee is 15 percent of subtotal
- total is subtotal plus platform fee
- worker payout estimate is 85 percent of subtotal

GPU rate examples:

- generic GPU: 1.25 USD per hour
- RTX 4090: 1.80 USD per hour
- A100: 4.50 USD per hour
- H100: 8.50 USD per hour

Priority multipliers:

- economy: 0.8
- standard: 1.0
- priority: 1.5

## Next steps

- persist vendors in Prisma
- connect compute quote to job creation
- add escrow reserve estimate
- add SLA and region multipliers
- add vendor API keys scoped by account
