"""Crop icon-only; remove white/gray chrome; keep saturated neon."""
from PIL import Image

src = r"C:\Users\Owner\.cursor\projects\c-Users-Owner-Downloads-crypto-website\assets\c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_073e8d659a27acc1d29460cb9ab23d85_images_image-9c02a736-8ac5-404e-9c8a-b8316b8ec27f.png"
dst = r"C:\Users\Owner\Downloads\crypto website\arc-light-logo.png"

im = Image.open(src).convert("RGBA")
w, h = im.size
cw = max(48, min(h + 8, int(w * 0.36)))
im = im.crop((0, 0, cw, h))
px = im.load()
w, h = im.size

def sat(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    return 0 if mx == 0 else (mx - mn) / mx

def keep_glow(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    s = sat(r, g, b)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

    # Drop white / light-gray UI frame
    if mx > 175 and s < 0.14:
        return False
    if lum > 215 and s < 0.2:
        return False

    if mx >= 150 and s >= 0.1 and mn >= 18:
        return True
    if mx >= 118 and s >= 0.32 and mn >= 26:
        return True
    if b >= 165 and (b - r) >= 32 and mn >= 40:
        return True
    if lum >= 128 and s >= 0.22 and mn >= 20:
        return True
    return False

out = Image.new("RGBA", (w, h))
opx = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 10:
            opx[x, y] = (0, 0, 0, 0)
            continue
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        mx = max(r, g, b)
        s = sat(r, g, b)

        if not keep_glow(r, g, b) and mx > 165 and s < 0.16:
            opx[x, y] = (0, 0, 0, 0)
            continue
        if not keep_glow(r, g, b) and min(r, g, b) > 150:
            opx[x, y] = (0, 0, 0, 0)
            continue
        if not keep_glow(r, g, b) and lum > 185:
            opx[x, y] = (0, 0, 0, 0)
            continue
        if (
            not keep_glow(r, g, b)
            and b > 48
            and b > r - 10
            and b > g - 22
            and 26 < lum < 210
        ):
            opx[x, y] = (0, 0, 0, 0)
            continue
        if not keep_glow(r, g, b) and lum < 115:
            opx[x, y] = (0, 0, 0, 0)
            continue

        opx[x, y] = (r, g, b, a)

bbox = out.getbbox()
if bbox:
    out = out.crop(bbox)
if out.width > 0:
    target = 256
    if out.width < target:
        s = max(2, (target + out.width - 1) // out.width)
        out = out.resize((out.width * s, out.height * s), Image.Resampling.LANCZOS)
out.save(dst, optimize=True)
print("saved", dst, out.size)
