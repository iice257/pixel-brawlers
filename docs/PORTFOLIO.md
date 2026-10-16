# Portfolio integration plan

## 1. Game as a portfolio project
- Card: "Pixel Brawlers - original 2D fighting game demo"
- Hero media: `media/gameplay.gif` (or short mp4) + cover image
- Links: playable build (GitHub Pages) + repo
- Tags: game dev, JavaScript, Canvas, pixel art, WebAudio
- Optional: embed the playable build in an iframe on the case study page

## 2. Motion design section (Scroll Swift chart videos)
- Gather the rendered videos into a `motion-design` section of the portfolio.
- Each entry: poster frame, 10-20s looping preview (muted mp4/webm), title, one-line description, tools used.
- Source files, project files and scratch notes stay in their own repo/folder; the portfolio only gets the optimized exports.
- Open question: location of the original Scroll Swift videos and whether they belong in this repo's `media/` or a separate showcase repo.

## 3. Asset hygiene
- Optimize video for web: H.264 mp4 under ~8 MB per clip, plus poster jpg.
- Keep large masters out of git (use Releases or LFS if they must be versioned).
