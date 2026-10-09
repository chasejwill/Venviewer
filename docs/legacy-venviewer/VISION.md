# Venviewer Vision

## What Venviewer is

Venviewer is Venview's standalone virtual tour platform. It is the system Venview will use to build, host, manage, publish, view, embed, and analyze virtual tours.

Today, Venviewer wraps Kuula for the actual tour runtime while Venview owns the product experience around those tours. Long term, Venviewer will replace third-party tour hosting with Venview-native asset storage, scene management, hotspots, and a full tour builder.

## Who it is for

Venviewer is built for:

- **Venview operators** managing tours for venues, listings, and clients
- **Venview organizations** that need a branded tour management workspace
- **End viewers** consuming published tours through public viewer and embed surfaces
- **Future Venview products** (venOS, Venview Platform) that will integrate when approved

venOS retired; kept as reference for a future Venview dashboard.

## Problems it solves

- Centralizes tour records, publishing, branding, and embed generation in one Venview-owned product
- Removes dependence on ad hoc Kuula links scattered across workflows
- Provides a consistent public viewer and iframe embed experience
- Prepares analytics, organization structure, and provider abstraction for future self-hosted tours

## Relationship to Venview

Venviewer is a first-party Venview product — not a module inside venOS. It has its own application, data model, API, and viewer runtime.

venOS retired; kept as reference for a future Venview dashboard.

All Venview virtual tour assets will eventually be built, hosted, managed, published, and viewed through Venviewer.

## Relationship to venOS

venOS retired; kept as reference for a future Venview dashboard.

venOS integration is **deferred**. Venviewer must reach standalone maturity before any connection to venOS is approved.

When integration happens later, venOS should consume Venviewer through its REST API and shared viewer components — not by duplicating tour logic internally.

## Why Venviewer exists separately from venOS

venOS retired; kept as reference for a future Venview dashboard.

- **Product clarity**: Tours are a major product surface deserving their own lifecycle and roadmap
- **Independent development**: Venviewer can evolve without blocking or being blocked by venOS releases
- **Clean boundaries**: Provider logic, publishing rules, and viewer rendering stay in one place
- **Future replacement of Kuula**: Self-hosted tours require asset pipelines and builder UX that do not belong inside venOS

## Long-term direction

Venviewer will become Venview's full virtual tour stack:

1. Upload and store panoramas securely
2. Build scenes, hotspots, and navigation
3. Host tour assets on Venview CDN infrastructure
4. Publish tours with access controls and branding
5. Serve viewers and embeds from Venview-owned routes
6. Measure performance through analytics

Kuula is an interim provider. The architecture treats it as one adapter among future providers (`venviewer`, `matterport`, `custom`).
