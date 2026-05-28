"""Generate Duck Desktop project logo - a cute duck icon on circular background."""
from PIL import Image, ImageDraw, ImageFont
import math
import os

SIZE = 512

def create_duck_logo():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # --- Background: gradient blue circle ---
    center = SIZE // 2
    radius = SIZE // 2 - 4

    for y in range(SIZE):
        for x in range(SIZE):
            dx = x - center
            dy = y - center
            dist = math.sqrt(dx*dx + dy*dy)
            if dist <= radius:
                # Gradient from top-left (light) to bottom-right (dark)
                ratio = (x / SIZE) * 0.5 + (y / SIZE) * 0.5
                r = int(30 + ratio * 40)
                g = int(120 + ratio * 60)
                b = int(200 + ratio * 40)
                img.putpixel((x, y), (r, g, b, 255))

    # --- Duck body (white ellipse) ---
    body_cx, body_cy = 260, 310
    body_rx, body_ry = 95, 85
    draw.ellipse(
        [body_cx - body_rx, body_cy - body_ry, body_cx + body_rx, body_cy + body_ry],
        fill=(255, 255, 255, 240), outline=None
    )

    # --- Duck head (white circle) ---
    head_cx, head_cy = 230, 210
    head_r = 70
    draw.ellipse(
        [head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r],
        fill=(255, 255, 255, 245), outline=None
    )

    # --- Beak (orange triangle) ---
    beak_points = [
        (head_cx + 50, head_cy - 5),
        (head_cx + 95, head_cy + 15),
        (head_cx + 50, head_cy + 30),
    ]
    draw.polygon(beak_points, fill=(255, 165, 0, 240))

    # --- Beak highlight ---
    draw.polygon([
        (head_cx + 55, head_cy + 2),
        (head_cx + 85, head_cy + 12),
        (head_cx + 55, head_cy + 20),
    ], fill=(255, 180, 30, 200))

    # --- Eye (black circle with white highlight) ---
    eye_x, eye_y = head_cx + 15, head_cy - 12
    eye_r = 12
    draw.ellipse(
        [eye_x - eye_r, eye_y - eye_r, eye_x + eye_r, eye_y + eye_r],
        fill=(30, 30, 30, 255)
    )
    # Eye highlight
    draw.ellipse(
        [eye_x - 4, eye_y - 6, eye_x + 4, eye_y + 1],
        fill=(255, 255, 255, 220)
    )

    # --- Wing hint (darker curve on body) ---
    draw.ellipse(
        [body_cx - 20, body_cy - 40, body_cx + 50, body_cy + 20],
        fill=(220, 230, 240, 120)
    )

    # --- Tail feathers ---
    tail_points = [
        (body_cx + 70, body_cy - 30),
        (body_cx + 110, body_cy - 55),
        (body_cx + 85, body_cy - 10),
        (body_cx + 115, body_cy - 25),
        (body_cx + 80, body_cy + 5),
    ]
    for i in range(0, len(tail_points) - 1, 2):
        draw.polygon([
            (body_cx + 70, body_cy - 20),
            tail_points[i],
            tail_points[i+1],
        ], fill=(255, 255, 255, 200))

    # --- Water ripples at bottom ---
    for i in range(3):
        wx = center + (i - 1) * 70
        wy = body_cy + body_ry - 10 + i * 15
        draw.arc(
            [wx - 50, wy - 15, wx + 50, wy + 15],
            start=0, end=180,
            fill=(255, 255, 255, 60 + i * 20), width=3
        )

    return img

def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(out_dir, '..', 'screenshots', 'duck_logo.png')

    logo = create_duck_logo()
    logo.save(output_path, 'PNG')
    print(f"Logo saved to {output_path}")
    print(f"Size: {logo.size}")

if __name__ == '__main__':
    main()
