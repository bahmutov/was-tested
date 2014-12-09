was-tested - Code coverage proxy
  version: 0.8.1
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