from PIL import Image
import numpy as np
import os
import sys

def crop_clean_icon(
    input_path: str,
    output_path: str | None = None,
    bg_threshold: int = 35,     # 越大 -> 去掉越多灰雾背景
    alpha_threshold: int = 10,  # alpha > 这个值才算前景
    padding: int = 4,
    force_white: bool = True,   # 像素风：把前景强制变纯白
):
    """
    bg_threshold:
        背景清理阈值（基于亮度）。如果背景残留，就把它调大：35->45->60
    alpha_threshold:
        用于确定裁剪边界的 alpha 阈值。一般保持 5~20
    force_white:
        True：前景变纯白（最干净的像素风）
        False：保留原本亮度（可能会有灰边）
    """

    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img).astype(np.uint8)

    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    # 1) 背景清理：把“接近黑”的像素直接设为透明
    # 用亮度判断（更稳）：Y = 0.2126R + 0.7152G + 0.0722B
    lum = (0.2126 * r + 0.7152 * g + 0.0722 * b).astype(np.float32)

    bg_mask = lum <= bg_threshold
    a[bg_mask] = 0

    # 2) 可选：像素风净化 —— 前景直接纯白（彻底去灰边）
    if force_white:
        fg_mask = a > alpha_threshold
        r[fg_mask] = 255
        g[fg_mask] = 255
        b[fg_mask] = 255

    # 写回
    arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3] = r, g, b, a
    cleaned = Image.fromarray(arr, mode="RGBA")

    # 3) 用 alpha 找紧边界（比 RGB 更干净）
    alpha = np.array(cleaned)[..., 3]
    ys, xs = np.where(alpha > alpha_threshold)

    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError("没有检测到前景像素（可能阈值太严格了）")

    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()

    tight = cleaned.crop((x0, y0, x1 + 1, y1 + 1))

    # 4) 居中到正方形 canvas
    w, h = tight.size
    size = max(w, h) + padding * 2
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(tight, ((size - w) // 2, (size - h) // 2))

    # 5) 输出
    if output_path is None:
        base, _ = os.path.splitext(input_path)
        output_path = base + "_clean.png"

    canvas.save(output_path)
    print("Saved:", output_path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python crop_clean_icon.py input.png")
        sys.exit(1)

    crop_clean_icon(sys.argv[1])
