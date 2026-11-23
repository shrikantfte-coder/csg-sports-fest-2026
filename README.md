# CSG Sports Fest 2026

Fixtures, teams, venues and player search for Table Tennis, Carrom, Chess, Cricket and Volleyball.

Live site: https://shrikantfte-coder.github.io/csg-sports-fest-2026/

Sport pages: add `#table-tennis`, `#carrom`, `#chess`, `#cricket` or `#volleyball` to the link.
QR codes for each page are in `qr/`.

## Updating fixtures

Everything the site shows lives in `data.json`. Organisers update it from `admin.html`
(link "Organiser login" at the bottom of the site): edit fixtures, results and teams, then
publish with a GitHub fine-grained token that has **Contents: Read and write** on this repository.
The admin passcode only hides the admin screen; the token is what protects changes.
To change the passcode, replace `PASS_HASH` in `admin.html` with the SHA-256 of the new passcode.
