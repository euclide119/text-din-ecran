# Text din Ecran
Scoate text și contacte din poze și filmări de ecran, în browser, pe telefon. Nu trimite date nicăieri: pagina are o politică CSP care permite conexiuni doar către propriile fișiere.

Biblioteci (Apache-2.0): tesseract.js 7.0.0, tesseract.js-core 6.1.2, date de limbă @tesseract.js-data ron 1.0.0 (4.0.0_best_int), verificate cu sha512 din npm.
Modificare în `ocr/worker.min.js`: `t.data` → `t.code` la unirea limbilor date ca obiecte.
