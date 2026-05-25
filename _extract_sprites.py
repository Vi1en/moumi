"""Extract individual character sprites from the master sheet."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
SRC = ROOT / "image.png"
OUT = ROOT / "assets" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
W, H = img.size
print(f"source: {W}x{H}")


def save(name: str, box: tuple[int, int, int, int]) -> None:
    """Crop with the given (left, top, right, bottom) and write a PNG."""
    crop = img.crop(box)
    path = OUT / f"{name}.png"
    crop.save(path)
    print(f"  -> {path.name}  ({crop.size[0]}x{crop.size[1]})")


# Top-left portrait panel: BOY / GIRL / HUSKY
# Panel runs roughly x=14..405, y=12..235 in the 1194x1317 source.
save("boy_portrait",   (40,   45, 165, 230))
save("girl_portrait",  (165,  45, 290, 230))
save("husky_portrait", (298, 110, 385, 230))

# Big bottom "BIRTHDAY CELEBRATION" group scenes
# Title row starts around y=1118, panel ends around y=1295
save("birthday_full",  (12, 1115, 960, 1300))
# Left third: trio in party hats with husky (great for hero scene)
save("hero_group",     (12, 1115, 320, 1300))
# Middle third: couple cutting birthday cake
save("cake_scene",     (320, 1115, 615, 1300))
# Right third: couple feeding husky at the cake table
save("share_scene",    (615, 1115, 960, 1300))


print("done.")
