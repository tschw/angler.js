angler.js
=========

is an anaglyph encoder library for the web.

It computes two 3x3 transformation matrices to encode stereoscopic images for
3D color filter glasses.

Try the [demo](http://tschw.github.io/angler.js/app)!


### Usage ###

```javascript

var mc = new angler.MatrixController();

mc.<property> = <value>;
// ...


mc.update();

// [... compute the sum of both linearized input color vectors transformed
// with mc.encoderL and mc.encoderR and gamma correct them. Note that the
// the matrix elements are stored in a Float32Array in column-major order. ]
```

Effective implementations of that last step vary based on the APIs in use.
For Canvas and WebGL see the files

- `app/classes/AnaglyphImageViewer.js` and
- `app/classes/AnaglyphVideoPlayer.js`.

For a complete list of properties see `src/angler/Properties.js` and observe
the console while running the demo.

### How does it work? ###

The transformation matrices are calculated via linear least squares
projection of the 6D stereo input color vector to a 3D output vector,
considering spectal properties of the display and the color filters.
This approach has originally been published by Eric Dubois in 2001.

I modified his method replacing CIE1931 XYZ with a perceptually uniform
RGB color space presented by Joanna Marguier in 2006 and removing the
normalization step in the original paper.

The weighting matrix envisioned in the original paper (but very ineffective
due to normalization) then allows for further spectral modeling.

References:

- http://www.site.uottawa.ca/~edubois/icassp01/anaglyphdubois.pdf
- http://infoscience.epfl.ch/record/97293/files/CIE_symp_marguier.pdf

### License ###

The library and the bundled tools may be used under the terms
of the [Apache License Version 2](http://www.apache.org/licenses/LICENSE-2.0).

The example files in the `app/examples` directory are licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

![Image: CC-BY-NC-SA](https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png)

