// Fixture timeline for testing the tools (not the film). 22 seconds, 5 shots.
// Palette holds 6..20 so the film stays continuous up to the fx-cells slot; its scene
// pages on a fixed 2s cycle, so frames inside the original 6..8 window do not move.
FILM.TIMELINE = {
  title: 'fixture',
  bpm: 120,
  duration: 22,
  shots: [
    { id: 'lib-showcase', file: '01-lib-showcase.js', start: 0, end: 2.5, mode: 'illustrated', brief: 'Every lib helper on one plate: paper, stripes, ink, hatching, stipple, blueprint, lattice, glows, guides.' },
    { id: 'fx-egg', file: '02-fx-egg.js', start: 2.5, end: 4.5, mode: 'schematic', brief: 'Blueprint egg with a cell lattice; two nuclei divide; magenta burst at the end.' },
    { id: 'fx-meadow', file: '03-fx-meadow.js', start: 4.5, end: 6, mode: 'illustrated', transitionIn: { dur: 0.5, kind: 'fade' }, brief: 'Stripes, a leaf and a crawling larva on twos; a flight arc draws on.' },
    { id: 'palette', file: '04-palette-sheet.js', start: 6, end: 20, mode: 'illustrated', brief: 'Every name in lib.pal as a labelled swatch, on paper above and blueprint below.' },
    { id: 'fx-cells', file: '11-fx-cells.js', start: 20, end: 22, mode: 'illustrated', brief: 'A scale mosaic in shifted rows and cracked earth on paper.' },
  ],
  cues: [
    { t: 0, kind: 'open' },
    { t: 2.5, kind: 'cut' },
    { t: 4.0, kind: 'burst' },
    { t: 4.5, kind: 'fade' },
    { t: 6, kind: 'cut' },
    { t: 20, kind: 'cut' },
  ],
};
