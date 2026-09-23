// Fixture timeline for testing the tools (not the film). 18 seconds.
// fx-flock-hold keeps 8..16 covered so this branch has no gap (check 4). Sibling
// showcases own that span; drop the hold when they merge and leave fx-flock at 16..18.
FILM.TIMELINE = {
  title: 'fixture',
  bpm: 120,
  duration: 18,
  shots: [
    { id: 'lib-showcase', file: '01-lib-showcase.js', start: 0, end: 2.5, mode: 'illustrated', brief: 'Every lib helper on one plate: paper, stripes, ink, hatching, stipple, blueprint, lattice, glows, guides.' },
    { id: 'fx-egg', file: '02-fx-egg.js', start: 2.5, end: 4.5, mode: 'schematic', brief: 'Blueprint egg with a cell lattice; two nuclei divide; magenta burst at the end.' },
    { id: 'fx-meadow', file: '03-fx-meadow.js', start: 4.5, end: 6, mode: 'illustrated', transitionIn: { dur: 0.5, kind: 'fade' }, brief: 'Stripes, a leaf and a crawling larva on twos; a flight arc draws on.' },
    { id: 'palette', file: '04-palette-sheet.js', start: 6, end: 8, mode: 'illustrated', brief: 'Every name in lib.pal as a labelled swatch, on paper above and blueprint below.' },
    { id: 'fx-flock-hold', file: '09-fx-flock.js', start: 8, end: 16, mode: 'illustrated', brief: 'Paper hold so the fixture timeline has no gap before fx-flock.' },
    { id: 'fx-flock', file: '09-fx-flock.js', start: 16, end: 18, mode: 'illustrated', brief: 'Two hundred chevron birds scattered in a cloud and drifting on one flow.' },
  ],
  cues: [
    { t: 0, kind: 'open' },
    { t: 2.5, kind: 'cut' },
    { t: 4.0, kind: 'burst' },
    { t: 4.5, kind: 'fade' },
    { t: 6, kind: 'cut' },
    { t: 8, kind: 'cut' },
    { t: 16, kind: 'cut' },
  ],
};
