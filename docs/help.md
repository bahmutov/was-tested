was-tested - Code coverage proxy
  version: 0.5.1
  author: "Gleb Bahmutov <gleb.bahmutov@gmail.com>"

Options:
  --version, -v     show version and exit                [default: false]
  --target, -t      target server url                    [default: "http://127.0.0.1:3003"]
  --port, -p        local proxy port                     [default: 5050]
  --instrument, -i  instrument url RegExp                [default: "app.js$"]
  --reset, -r       erase previously collected coverage  [default: false]