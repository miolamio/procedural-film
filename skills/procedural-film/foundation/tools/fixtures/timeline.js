// Fixture timeline for testing the tools (not the film). 28 seconds, 5 shots.
FILM.TIMELINE = {
  title: 'fixture',
  bpm: 120,
  duration: 28,
  shots: [
    { id: 'lib-showcase', file: '01-lib-showcase.js', start: 0, end: 2.5, mode: 'illustrated', brief: 'Every lib helper on one plate: paper, stripes, ink, hatching, stipple, blueprint, lattice, glows, guides.' },
    { id: 'fx-egg', file: '02-fx-egg.js', start: 2.5, end: 4.5, mode: 'schematic', brief: 'Blueprint egg with a cell lattice; two nuclei divide; magenta burst at the end.' },
    { id: 'fx-meadow', file: '03-fx-meadow.js', start: 4.5, end: 6, mode: 'illustrated', transitionIn: { dur: 0.5, kind: 'fade' }, brief: 'Stripes, a leaf and a crawling larva on twos; a flight arc draws on.' },
    { id: 'palette', file: '04-palette-sheet.js', start: 6, end: 26, mode: 'illustrated', brief: 'Every name in lib.pal as a labelled swatch, on paper above and blueprint below.' },
    { id: 'fx-smear', file: '14-fx-smear.js', start: 26, end: 28, mode: 'illustrated', brief: 'Two wings flap in three drawings: bare on the left, ghosts and speed lines on the right.' },
  ],
  cues: [
    { t: 0, kind: 'open' },
    { t: 2.5, kind: 'cut' },
    { t: 4.0, kind: 'burst' },
    { t: 4.5, kind: 'fade' },
    { t: 6, kind: 'cut' },
  ],
};
