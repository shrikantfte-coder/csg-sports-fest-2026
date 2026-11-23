# CSG Sports Fest 2026

Fixtures, teams, venues and player search for Table Tennis, Carrom, Chess, Cricket and Volleyball.

Live site: https://shrikantfte-coder.github.io/csg-sports-fest-2026/

Sport pages: add `#table-tennis`, `#carrom`, `#chess`, `#cricket` or `#volleyball` to the link.
QR codes for each page are in `qr/`.

## Updating fixtures and winners

Everything the site shows lives in `data.json`. The site (`index.html` + `site.js`) and the admin page
(`admin.html`) share the winner and standings logic in `core.js`.

Organisers log in at `admin.html` ("Organiser login" at the bottom of the site) with the shared
username and password. From there they can:

- **Update winners**: tap the winner of each match. "Winner of M01" slots, the carrom round robin and
  the final fill in automatically, and the site shows standings and champions.
- **Fixtures / Teams**: edit or add matches, results, rosters and the fest dates.
- **QR codes & links**: copy links, download QR images, print an A4 sheet or a poster per sport.
- **Publish**: saves `data.json` to this repository; GitHub Pages updates the site within ~2 minutes.
  Changes from two organisers at once are merged match by match.

Publishing needs a GitHub fine-grained token with **Contents: Read and write** on this repository.
The owner saves it once under **Login & settings**; it is stored in `admin-config.json`, encrypted
(AES-GCM, key from the password via PBKDF2) so only someone with the username and password can use it.
Change the username or password from the same screen. Don't edit `admin-config.json` by hand.
