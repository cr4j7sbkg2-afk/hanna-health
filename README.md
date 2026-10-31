# Hanna Health – MVP app (prototípus)

Kattintható prototípus a Hanna Health nőgyógyászati és magzati medicina rendelő mobilalkalmazásához, telefonos teszteléshez.

**Megnyitás:** https://cr4j7sbkg2-afk.github.io/hanna-health/ – telefonon Safariban. A Megosztás › „Hozzáadás a főképernyőhöz” menüponttal teljes képernyős appként is elindítható.

## Fontos

- Ez demó: valós páciensadatot ne írj bele. Újratöltéskor minden visszaáll, semmi nem mentődik és nem küldődik el.
- Az orvosi tartalmak általános tájékoztatások, orvosi lektorálás előtt állnak.
- A szögletes zárójeles részek ([ár], [Rendelő címe], [X] óra stb.) kitöltendő helyőrzők.
- Az oldal keresőmotoroknak nem indexelhető (noindex, robots.txt), de aki ismeri a linket, megnyithatja.

## Tartalom

- `index.html` – az app egyetlen önálló oldalként (Preact a jsDelivr-ről, betűtípusok a Google Fontsról). Generált fájl, kézzel ne szerkeszd.
- `source/Main.dc.html` – a forrás: a „Hanna Health – MVP app” Design vászon artboardjának pillanatképe.
- `tools/build-phone.js` – a forrásból elkészíti az `index.html`-t.
- `manifest.webmanifest`, ikonok – a főképernyőre helyezéshez.

## Frissítés

Az app a Design vásznon készül, ez a repó annak másolata, és nem frissül magától.

1. A vászon `project/Main.dc.html` fájljának aktuális változatát másold a `source/Main.dc.html` helyére.
2. Futtasd: `node tools/build-phone.js source/Main.dc.html index.html`
3. Commitold és töltsd fel a `main` ágra. A GitHub Pages egy-két percen belül frissíti az oldalt, a link nem változik.

Ha a 2. lépés „Layout anchor changed” hibával áll le, a vásznon megváltozott az app kerete (fejléc, menü, képernyőmagasság). Ilyenkor a `tools/build-phone.js` elején lévő `swaps` listát kell az új keretre igazítani.
