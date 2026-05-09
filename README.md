# Hearthwild

Hearthwild is an open-source web game project focused on clean 2.5D presentation, efficient rendering, and a disciplined game architecture.

The current milestone is a playable onboarding slice: a low-poly valley start, minimalist menu flow, 3D character selection, NPC dialogue, resource gathering, tool crafting, prop collision, and a compact game HUD. The goal is to grow this into a polished browser RPG-life-sim world without letting rendering, simulation, input, and UI become tangled.

## Features

- Web-based 3D runtime with Three.js, TypeScript, and Vite
- Orthographic 2.5D camera inspired by isometric RPGs
- Generated low-poly menu hero optimized as WebP for fast startup
- Minimal main menu, short loading beat, 3D character selection flow, and first in-game onboarding sequence
- Procedural low-poly grass, biome ground patches, main trails, branch trails, and irregular polygon transitions
- WASD and arrow-key player movement
- Articulated low-poly player with idle, forward-lean walk, planted-foot gait phases, and run blending
- Three selectable character silhouettes with palette variants
- Browser-safe procedural audio with UI, action, ambient, and region feedback buses
- Modular 3D props: pine, oak, birch, willow, rocks, boulders, ore, crystals, logs, stumps, flowers, reeds, mushrooms, bridge, dock, runestones, totem, tent, house, farm plots, well, workbench, chest, campfire, torches, and ruins
- Guided first resource loop for wood, stone, herbs, and coins
- First combat loop scaffold with gated guardian encounters, damage, knockback, attack animation, and hit feedback
- Multiple encounter silhouettes across biomes with different movement speed, health, and collision radius
- Early tool progression with a wooden pickaxe tutorial step
- Larger authored world with village, meadow, pine forest, highland, and wetland regions
- Compact HUD with hearts, resources, objective checklist, action prompt, hotbar, and inventory panel
- Prop collision with shape-aware circle and capsule hitboxes
- Efficient tile rendering through `InstancedMesh`
- Renderer-independent simulation state
- Responsive fullscreen canvas with a minimal DOM HUD
- MIT licensed and ready for open-source collaboration

## Quick Start

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Controls

| Action | Keys |
| --- | --- |
| Move | `WASD` or arrow keys |
| Sprint | `Shift` |
| Attack | `Space` |
| Interact / gather | `E` |
| Build | `B` |
| Toggle pack | `I` |

## Direction

Hearthwild is aiming for a long-running open-world loop:

- explore a readable low-poly wilderness
- gather resources from authored modular props
- build a small settlement into a town
- fight roaming threats with simple, skill-based combat
- unlock tools, weapons, farming, puzzles, and story events over time
- keep every gameplay system data-driven enough for open-source contributors to extend

## Project Structure

```text
src/
  game/
    input/          Input mapping and action state
    simulation/     Serializable gameplay state and rules
  render/
    app/            Renderer, scene, camera, and main loop
    materials/      Procedural materials and texture helpers
    objects/        Three.js scene objects
  ui/               DOM HUD
```

## Development Principles

- Simulation owns game truth; Three.js objects only present it.
- UI remains in DOM unless the scene truly needs canvas-rendered text.
- The first playable view stays low-chrome and readable.
- Rendering choices must stay measurable and efficient.
- Assets should eventually ship as optimized GLB or glTF 2.0 when 3D models are introduced.

## License

MIT
