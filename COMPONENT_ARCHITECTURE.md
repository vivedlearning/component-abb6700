# ABB 6700 — Component Architecture

## Folder Boundaries

```text
src/
├── Domain/
│   ├── Adapters/
│   ├── Controllers/
│   ├── Entities/
│   ├── Factory/
│   ├── Mocks/
│   ├── PMs/
│   └── UCs/
└── Frameworks/
    └── Babylon/
```

- `src/Domain/` contains framework-agnostic component logic.
- `src/Frameworks/Babylon/` contains Babylon.js-specific composition and view code.
- `src/Domain/` must not import from `src/Frameworks/`.
- Package exports stay centralized in `src/index.ts`.

## ABB6700 Instance Wiring

`setupABB6700InstanceFactory` lives in `src/Domain/Factory/setupABB6700InstanceFactory.ts` and is exported from the package root for advanced consumers.

During `ABB6700FeatureFactory.setupEntities()`, the component:

1. Creates or registers the singleton `ABB6700Repo`
2. Wires `setupABB6700InstanceFactory(appObjects)`

For each ABB6700 instance, `setupABB6700InstanceFactory` creates:

- `ABB6700Entity`
- `SetJointAngleUC`
- `SetPoseUC`
- `CalcStabilizerUC`
- `ABB6700PM`

Babylon view creation stays outside the domain factory and happens through `src/Frameworks/Babylon/createBabylonABB6700.ts`.

## Contributor Checklist

- Keep domain code under `src/Domain/`
- Keep Babylon-only code under `src/Frameworks/Babylon/`
- Do not add `Frameworks` imports anywhere inside `src/Domain/`
- Update `src/index.ts` when moving or adding public exports
- Keep `COMPONENT_KNOWLEDGE.md` consumer-facing and put contributor-only notes here

## Architecture Support

For architecture-specific guidance, use Vivian MCP as the architecture expert for the VIVED component standard.
