// Fixture timeline for testing the tools (not the film). 18 seconds, 9 shots.
FILM.TIMELINE = {
  title: 'fixture',
  bpm: 120,
  duration: 18,
  shots: [
    { id: 'lib-showcase', file: '01-lib-showcase.js', start: 0, end: 2.5, mode: 'illustrated', brief: 'Every lib helper on one plate: paper, stripes, ink, hatching, stipple, blueprint, lattice, glows, guides.' },
    { id: 'fx-egg', file: '02-fx-egg.js', start: 2.5, end: 4.5, mode: 'schematic', brief: 'Blueprint egg with a cell lattice; two nuclei divide; magenta burst at the end.' },
    { id: 'fx-meadow', file: '03-fx-meadow.js', start: 4.5, end: 6, mode: 'illustrated', transitionIn: { dur: 0.5, kind: 'fade' }, brief: 'Stripes, a leaf and a crawling larva on twos; a flight arc draws on.' },
    { id: 'palette', file: '04-palette-sheet.js', start: 6, end: 8, mode: 'illustrated', brief: 'Every name in lib.pal as a labelled swatch, on paper above and blueprint below.' },
    { id: 'fx-draw-on', file: '05-fx-draw-on.js', start: 8, end: 10, mode: 'illustrated', brief: 'A closed shape and a spiral draw on with a nib; a running dash travels a line.' },
    { id: 'fx-pulse', file: '06-fx-pulse.js', start: 10, end: 12, mode: 'illustrated', brief: 'Circles pulse on fixture cues; metronome ticks on sixteenths.' },
    { id: 'fx-morph', file: '07-fx-morph.js', start: 12, end: 14, mode: 'illustrated', brief: 'Fixture egg morphs into the leaf and back, inked, hatched inside.' },
    { id: 'fx-particles', file: '08-fx-particles.js', start: 14, end: 16, mode: 'schematic', brief: 'Sparks from a point, pollen over paper, smoke rising.' },
    { id: 'fx-flock', file: '09-fx-flock.js', start: 16, end: 18, mode: 'illustrated', brief: 'Two hundred chevron birds scattered in a cloud and drifting on one flow.' },
  ],
  cues: [
    { t: 0, kind: 'open' },
    { t: 2.5, kind: 'cut' },
    { t: 4.0, kind: 'burst' },
    { t: 4.5, kind: 'fade' },
    { t: 6, kind: 'cut' },
    { t: 10, kind: 'open' },
    { t: 10.5, kind: 'cut' },
    { t: 11, kind: 'burst' },
    { t: 11.5, kind: 'fade' },
  ],
};
