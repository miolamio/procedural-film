// A fresh canvas on every frame. Not part of the default fixture film.
FILM.TIMELINE = {
  title: 'canvas-each-frame',
  duration: 0.5,
  shots: [
    { id: 'canvas-each-frame', file: '01-alloc.js', start: 0, end: 0.5, mode: 'raw', brief: 'document.createElement(canvas) on every frame.' },
  ],
};
