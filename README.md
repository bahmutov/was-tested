# was-tested

> Code coverage proxy

[![NPM][was-tested-icon] ][was-tested-url]

[![Build status][was-tested-ci-image] ][was-tested-ci-url]
[![dependencies][was-tested-dependencies-image] ][was-tested-dependencies-url]
[![devdependencies][was-tested-devdependencies-image] ][was-tested-devdependencies-url]
[![Codacy Badge][was-tested-codacy-image] ][was-tested-codacy-url]
[![semantic-release][semantic-image] ][semantic-url]

[was-tested-icon]: https://nodei.co/npm/was-tested.png?downloads=true
[was-tested-url]: https://npmjs.org/package/was-tested
[was-tested-ci-image]: https://travis-ci.org/bahmutov/was-tested.png?branch=master
[was-tested-ci-url]: https://travis-ci.org/bahmutov/was-tested
[was-tested-dependencies-image]: https://david-dm.org/bahmutov/was-tested.png
[was-tested-dependencies-url]: https://david-dm.org/bahmutov/was-tested
[was-tested-devdependencies-image]: https://david-dm.org/bahmutov/was-tested/dev-status.png
[was-tested-devdependencies-url]: https://david-dm.org/bahmutov/was-tested#info=devDependencies
[was-tested-codacy-image]: https://www.codacy.com/project/badge/c2b210ee4fde4f21a7f9c6cc41078e30
[was-tested-codacy-url]: https://www.codacy.com/public/bahmutov/was-tested.git
[semantic-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-url]: https://github.com/semantic-release/semantic-release



![overview](https://raw.githubusercontent.com/bahmutov/was-tested/master/images/was-tested-overview.png)

Read [Code coverage proxy](https://glebbahmutov.com/blog/code-coverage-proxy/) blog post.

```
was-tested - Code coverage proxy
  version: 0.0.0-semantic-release
  author: "Gleb Bahmutov <gleb.bahmutov@gmail.com>"

Options:
  --version, -v     show version and exit                               [default: false]
  --target, -t      target server url                                   [default: "http://127.0.0.1:3003"]
  --host, -H        the http host header                                [default: false]
  --rehost, -z      The host to rewrite to in the event of a redirect.  [default: false]
  --port, -p        local proxy port                                    [default: 5050]
  --instrument, -i  instrument url RegExp                               [default: "app.js$"]
  --reset, -r       erase previously collected coverage                 [default: false]
  --folder, -f      working folder                                      [default: null]

```

Works well with [tested-commits](https://github.com/bahmutov/tested-commits).

### Use against github pages

To instrument static pages on github, for example [glebbahmutov.com/foo-bar/](http://glebbahmutov.com/foo-bar/)
that points to gh-pages branch in [foo-bar](https://github.com/bahmutov/foo-bar) use `--host` option.

`was-tested --target http://glebbahmutov.com/foo-bar/ --host "glebbahmutov.com"`

then open `localhost:5050` in the browser.

### Small print

Author: Gleb Bahmutov &copy; 2014

* [@bahmutov](https://twitter.com/bahmutov)
* [glebbahmutov.com](http://glebbahmutov.com)
* [blog](https://glebbahmutov.com/blog/)

License: MIT - do anything with the code, but don't blame me if it does not work.

Spread the word: tweet, star on github, etc.

Support: if you find any problems with this module, email / tweet /
[open issue](https://github.com/bahmutov/was-tested/issues) on Github



## MIT License

The MIT License (MIT)

Copyright (c) 2014 Gleb Bahmutov

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


