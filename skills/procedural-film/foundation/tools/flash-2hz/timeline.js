// 1s black/white strobe at 2 Hz. A passing control for check 9, not part of the default fixture film.
FILM.TIMELINE = {
  title: 'flash-2hz',
  duration: 1,
  shots: [
    { id: 'strobe-2', file: '01-strobe.js', start: 0, end: 1, mode: 'raw', brief: 'Full-frame black/white strobe at 2 Hz.' },
  ],
};
