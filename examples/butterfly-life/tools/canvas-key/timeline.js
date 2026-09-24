// Same static blur as canvas-nokey, with a stable key. Not part of the default fixture film.
FILM.TIMELINE = {
  title: 'canvas-key',
  duration: 0.5,
  shots: [
    { id: 'blur-key', file: '01-blur.js', start: 0, end: 0.5, mode: 'raw', brief: 'Static blur with an inline arrow and a key.' },
  ],
};
