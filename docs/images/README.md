# ResolveOS Screenshot & Image Assets Directory

This folder contains the visual guide screenshots and architecture diagrams displayed in the root `README.md`, documentation, and GitHub release notes.

## Recommended Screenshots & File Naming Conventions:

| File Name | Description | Recommended Dimension |
| :--- | :--- | :--- |
| `01-landing-hero.png` | Public showcase page with hero and 1-click demo button | 1920x1080 (16:9) |
| `02-12-stage-lifecycle.png` | Interactive 12-stage scientific resolution explorer | 1920x1080 (16:9) |
| `03-pii-redactor-sandbox.png` | Live PII & secrets sanitization sandbox in action | 1600x900 |
| `04-operations-dashboard.png` | Incident command center with active Sev-1 radar & KPI cards | 1920x1080 |
| `05-12-stage-case-detail.png` | Case detail view with 12-stage milestone stepper and completeness score | 1920x1080 |
| `06-root-cause-5whys.png` | Recursive 5-Whys causality chain and Ishikawa fishbone diagram | 1600x900 |
| `07-solution-matrix.png` | Multi-criteria weighted viability matrix | 1600x900 |
| `08-empirical-verification.png` | Expected vs Observed telemetry delta with PASSED verification outcome | 1600x900 |
| `09-3d-case-mesh.png` | WebGL 2.0 Three.js 3D relational network graph | 1920x1080 |
| `10-workspace-settings.png` | Settings center with retention controls and member management | 1920x1080 |
| `11-legal-compliance.png` | Legal & regulatory specification view | 1920x1080 |

## How to Add Your Screenshots:
1. Capture screenshots of the application running locally at `http://localhost:5173`.
2. Save your `.png` or `.webp` files into this directory (`docs/images/`).
3. Commit and push:
   ```bash
   git add docs/images/
   git commit -m "docs(assets): add UI walkthrough screenshots and guide images"
   git push
   ```
4. They will automatically render on GitHub!
