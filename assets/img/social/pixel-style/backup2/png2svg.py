from PIL import Image
import os
import sys

def png_to_pixel_svg(png_path, svg_path=None, alpha_thresh=1, scale=1):
    """
    alpha_thresh: alpha > 这个值才当作前景像素
    scale: 一个像素放大成多少 SVG 单位（一般 1 就好；想更大就 10）
    输出 SVG 使用 fill="currentColor"；你用 CSS 的 color 控制颜色
    """
    img = Image.open(png_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    rects = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > alpha_thresh:
                rects.append(
                    f'<rect x="{x*scale}" y="{y*scale}" width="{scale}" height="{scale}" fill="currentColor"/>'
                )

    if svg_path is None:
        base, _ = os.path.splitext(png_path)
        svg_path = base + ".svg"

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w*scale} {h*scale}" width="{w*scale}" height="{h*scale}">',
        *rects,
        "</svg>",
    ]
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg))

    print("Saved:", svg_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python png2pixel_svg.py icon.png [alpha_thresh] [scale]")
        sys.exit(1)

    png = sys.argv[1]
    alpha = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    scale = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    png_to_pixel_svg(png, alpha_thresh=alpha, scale=scale)
