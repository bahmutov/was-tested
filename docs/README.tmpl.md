# {%= name %}

> {%= description %}

{%= _.doc("./docs/badges.md") %}

![overview](https://raw.githubusercontent.com/bahmutov/was-tested/master/images/was-tested-overview.png)

Read [Code coverage proxy](https://glebbahmutov.com/blog/code-coverage-proxy/) blog post.

```
{%= _.doc("./docs/help.md") %}
```

Works well with [tested-commits](https://github.com/bahmutov/tested-commits).

### Use against github pages

To instrument static pages on github, for example [glebbahmutov.com/foo-bar/](http://glebbahmutov.com/foo-bar/)
that points to gh-pages branch in [foo-bar](https://github.com/bahmutov/foo-bar) use `--host` option.

`was-tested --target http://glebbahmutov.com/foo-bar/ --host "glebbahmutov.com"`

then open `localhost:5050` in the browser.

{%= _.doc("./docs/footer.md") %}

## MIT License

{%= _.doc("./LICENSE") %}
