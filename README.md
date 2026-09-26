# procedural-film

![Six frames from the butterfly-life film, alternating hand-inked paper shots and navy blueprint shots](media/banner.jpg)

An agent skill that turns a topic into a 30-second vertical film.
Every pixel is drawn in vanilla JavaScript on a canvas and every sound is synthesised in Web Audio, so the film ships with zero media assets.
The output is one self-contained HTML player plus MP4 exports.

The reference film is `examples/butterfly-life`, the life cycle of a monarch butterfly: 17 shots, 32 seconds, 120 bpm, 1080x1920 at 24 fps.

- Watch the phone cut: [`examples/butterfly-life/exports/butterfly-life-phone.mp4`](examples/butterfly-life/exports/butterfly-life-phone.mp4)
- Interactive player: download [`examples/butterfly-life/dist/butterfly-life.html`](examples/butterfly-life/dist/butterfly-life.html) and open it in a browser

## What is in the repo

| Path | Contents |
|---|---|
| `skills/procedural-film/` | The skill. `SKILL.md` is the pipeline, `foundation/` is the engine and tools copied into each new film, `templates/` holds the four planning documents, `reference/` holds the shot-type index, scene and music guides, and frames from the example as the visual target. |
| `examples/butterfly-life/` | The butterfly film as the skill produces it: planning docs, source, tools, the HTML player and the phone MP4. |

## Requirements

- Node.js 20 or newer
- ffmpeg on the `PATH`
- Chromium for Playwright, installed after the `npm install` below with `npx --prefix examples/butterfly-life/tools playwright install chromium`
- An agent that runs skills and dispatches parallel subagents, for example Claude Code

## Install the skill

Clone the repo, then link the skill into your agent's skills folder.
A link keeps the worked example reachable at `examples/butterfly-life/` beside the skill.

```bash
git clone https://github.com/kuhnhomeuk-cell/procedural-film.git
```

```bash
ln -s "$PWD/procedural-film/skills/procedural-film" ~/.claude/skills/procedural-film
```

For another agent, link it into that agent's skills folder.

## Make a film

Ask your agent for a procedural film about a subject, for example "make a procedural film about the life of a honeybee".
`skills/procedural-film/SKILL.md` holds the full pipeline.
Expect a long run: one agent per shot writes a scene file of 1000+ lines, then critic waves review every shot, so a film spends a large share of a usage plan.

## Rebuild the butterfly film

```bash
npm install --prefix examples/butterfly-life/tools
```

```bash
node examples/butterfly-life/tools/check.cjs
```

```bash
node examples/butterfly-life/tools/render.cjs
```

`check.cjs` runs the twelve-check gate and exits 0 when green; `--shot <id>` gates one shot on its own.
`render.cjs` writes `examples/butterfly-life/exports/butterfly-life.mp4`.
`node examples/butterfly-life/tools/build.cjs` rebuilds the HTML player.

## Credit

The look and editing are modelled on Kevin Ngo's ["The life of a fruit fly"](https://x.com/kevin_t_ngo/status/2099858454043349342).
`examples/butterfly-life/docs/reference-analysis.md` records what was taken from it.

## License

MIT. See [`LICENSE`](LICENSE).
