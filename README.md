# Aidan's Raptor Match

A two-player memory match game with dinosaurs, mostly raptors. Each card shows a
cartoon dinosaur with its name and a sounding-out guide, since a lot of raptors
look alike.

## How to play

1. Type in both players' names and pick a game length: **Quick** (12 cards),
   **Medium** (20) or **Long** (30).
2. Take turns flipping two cards. Find a matching pair and you score it, see a
   fun fact about that dinosaur, and go again. If the cards don't match, they
   flip back and it's the other player's turn.
3. Whoever finds the most pairs wins. Tap any pair you've already found to see
   its fun fact again.

Each game deals a random mix that's about two-thirds raptors. "Play again"
swaps who goes first.

## Putting it online with GitHub Pages

The game is plain HTML, CSS and JavaScript with no build step, so GitHub Pages
can serve it straight from this repo:

1. On GitHub, open the repo's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
3. Pick the `main` branch and the `/ (root)` folder, then **Save**.

After a minute or two the game will be live at
<https://drew879.github.io/dino-match/>.

## Running it locally

Open `index.html` in a browser, or serve the folder with any static server
(for example `npx http-server .`).

## What's where

| File | What it does |
| --- | --- |
| `index.html` | Page structure: start screen, board, popups |
| `css/style.css` | All the styling |
| `js/art.js` | The cartoon raptor drawing (shared body, feathers, sickle claw) |
| `js/art-custom.js` | Hand-built drawings for the dinosaurs with unusual shapes |
| `js/dinos.js` | The roster: names, pronunciations, fun facts and colors |
| `js/sound.js` | Sound effects, made in the browser (no audio files) |
| `js/game.js` | Game rules, turns, scoring and layout |

## The roster

**Raptors:** Velociraptor, Deinonychus, Utahraptor, Dakotaraptor, Microraptor,
Austroraptor, Buitreraptor, Pyroraptor, Achillobator, Dromaeosaurus,
Bambiraptor, Sinornithosaurus, Halszkaraptor, Atrociraptor

**Other dinosaurs:** Therizinosaurus, Pachycephalosaurus, Parasaurolophus,
Carnotaurus, Amargasaurus, Oviraptor

The fun facts were checked against museum and science-news sources and kept to
well-supported claims.
