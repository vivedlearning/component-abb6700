# **ABB 6700** Internal Architecture

This document is for contributors and maintainers of `@vived/component-abb-6700`.
Use `COMPONENT_KNOWLEDGE.md` for Vivian training and consumer-facing usage guidance.

For architecture questions, consult Vivian — the VIVED team's canon in the
[`vivedlearning/vivian-knowledge`](https://github.com/vivedlearning/vivian-knowledge) repo.
It is plain markdown read with `gh`; start from its `index.md`, whose one-line page
descriptions are the retrieval mechanism.

## Architecture Overview

The component follows VIVED clean architecture boundaries:

```text
Controllers (thin boundary functions)
    -> Use Cases
    -> Entities (source of truth)
    -> PMs (immutable VMs)
    -> Adapters (framework-agnostic subscriptions)
    -> Frameworks/Babylon (view + composition)
```

## Folder Boundaries

- `src/Domain/Adapters`
- `src/Domain/Controllers`
- `src/Domain/Entities`
- `src/Domain/Factory`
- `src/Domain/Mocks`
- `src/Domain/PMs`
- `src/Domain/UCs`
- `src/Frameworks/Babylon`

## Dependency Rules

- Domain code must not import `Frameworks/*`.
- `Frameworks/Babylon` may import Domain code.
- Framework-dependent behavior should be introduced in `Frameworks/*` and wired during composition.

## Factory Setup

Domain setup uses `DomainFactory` and a local per-instance factory in:

- `src/Domain/Factory/ABB6700FeatureFactory.ts`

The per-instance factory creates, in order:

- `ABB6700Entity`
- Per-instance UCs (`SetJointAngleUC`, `SetPoseUC`, `CalcStabilizerUC`)
- `ABB6700PM`

## Multi-UC Extension Pattern

Add new UCs in the local per-instance factory in this order:

1. Create entity
2. Create UCs
3. Create PM

This ensures PM subscriptions see a fully initialized domain object graph.

## Framework Composition

Babylon composition is implemented in:

- `src/Frameworks/Babylon/createBabylonABB6700.ts`
- `src/Frameworks/Babylon/ABB6700BabylonView.ts`

`createBabylonABB6700` resolves repo + entity and initializes view setup.

## Contributor Validation Checklist

- [ ] Domain imports do not reference `Frameworks/*`
- [ ] Public exports in `src/index.ts` remain accurate
- [ ] Integration tests pass for create/set-joint-angle/set-pose/calc-stabilizer/subscribe/unsubscribe flows
- [ ] `COMPONENT_KNOWLEDGE.md` matches current API signatures
