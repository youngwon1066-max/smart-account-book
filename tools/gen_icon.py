#!/usr/bin/env python3
"""귀여운 돼지저금통 감성 가계부 앱 아이콘 생성 (192 / 512 px)."""
from PIL import Image, ImageDraw
import os

S = 512  # master size
SS = 4   # supersampling factor for antialiasing
W = S * SS

BG = (240, 242, 245, 255)        # #f0f2f5 뉴모피즘 배경
BODY = (255, 158, 176, 255)      # 파스텔 핑크 돼지
BODY_SHADE = (244, 128, 154, 255)
BODY_DARK = (211, 98, 127, 255)  # 외곽선
SNOUT = (255, 178, 193, 255)
NOSTRIL = (196, 84, 112, 255)
CHEEK = (255, 197, 208, 255)
COIN = (255, 205, 92, 255)       # 골드 코인
COIN_DARK = (224, 163, 44, 255)
HEART = (255, 105, 135, 255)
INK = (74, 62, 72, 255)


def r(x):
    return x * SS


def heart(d, cx, cy, size, fill):
    """cx, cy 중심, size: 폭 절반."""
    x, y, s = cx, cy, size
    d.polygon([(x, y + s * 0.55), (x - s, y - s * 0.15), (x + s, y - s * 0.15)], fill=fill)
    d.ellipse([x - s, y - s, x, y], fill=fill)
    d.ellipse([x, y - s, x + s, y], fill=fill)


def rotated_ear(base, box, angle, fill, outline=None, width=0):
    """잎사귀(타원) 모양 귀를 회전해서 붙인다."""
    pad = 40 * SS
    ew = box[2] - box[0] + 2 * pad
    eh = box[3] - box[1] + 2 * pad
    tmp = Image.new("RGBA", (ew, eh), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    bb = [pad, pad, ew - pad, eh - pad]
    td.ellipse(bb, fill=fill, outline=outline, width=width)
    tmp = tmp.rotate(angle, resample=Image.BICUBIC, expand=False)
    base.alpha_composite(tmp, (box[0] - pad, box[1] - pad))


def draw_icon():
    img = Image.new("RGBA", (W, W), BG)
    d = ImageDraw.Draw(img)

    # 배경 링 (은은한 뉴모피즘 느낌)
    d.ellipse([r(30), r(30), r(482), r(482)], outline=(224, 229, 236, 255), width=r(13))

    # --- 코인 (등 위 슬롯 중앙에서 떨어지는 중) ---
    d.ellipse([r(250), r(62), r(326), r(138)], fill=COIN_DARK)      # 뒤편
    d.ellipse([r(242), r(54), r(318), r(130)], fill=COIN)           # 앞면
    d.ellipse([r(256), r(68), r(304), r(116)], outline=COIN_DARK, width=r(6))
    heart(d, r(280), r(92), r(11), HEART)

    # --- 귀 (뒤, 몸통 뒤에 먼저 그림) ---
    rotated_ear(img, (r(168), r(112), r(228), r(178)), -25, BODY_SHADE)

    # --- 꼬리 (왼쪽, 빙글빙글) ---
    d.arc([r(60), r(240), r(122), r(302)], start=90, end=360, fill=BODY_DARK, width=r(10))
    d.arc([r(80), r(260), r(126), r(306)], start=270, end=90, fill=BODY_DARK, width=r(10))

    # --- 몸통 ---
    d.ellipse([r(78), r(136), r(438), r(412)], fill=BODY)

    # --- 다리 ---
    for lx in (140, 300):
        d.rounded_rectangle([r(lx), r(378), r(lx + 58), r(432)], radius=r(24), fill=BODY_SHADE)

    # --- 귀 (앞, 외곽선) ---
    rotated_ear(img, (r(186), r(102), r(254), r(170)), -25, BODY, BODY_DARK, r(6))

    # --- 코인 슬롯 (등 위) ---
    d.rounded_rectangle([r(246), r(152), r(346), r(178)], radius=r(13), fill=BODY_DARK)

    # --- 주둥이 (오른쪽) ---
    d.ellipse([r(322), r(240), r(424), r(324)], fill=SNOUT, outline=BODY_DARK, width=r(6))
    d.ellipse([r(350), r(266), r(376), r(298)], fill=NOSTRIL)
    d.ellipse([r(392), r(266), r(418), r(298)], fill=NOSTRIL)

    # --- 눈 ---
    d.ellipse([r(278), r(196), r(314), r(232)], fill=INK)
    d.ellipse([r(286), r(202), r(300), r(216)], fill=(255, 255, 255, 255))

    # --- 볼터치 ---
    d.ellipse([r(246), r(254), r(288), r(288)], fill=CHEEK)

    # --- 하트 장식 (몸통 안쪽) ---
    heart(d, r(168), r(290), r(30), HEART)

    return img


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    img = draw_icon()
    for size in (192, 512):
        resized = img.resize((size, size), Image.LANCZOS)
        path = os.path.join(out_dir, f"icon-{size}.png")
        resized.save(path, "PNG", optimize=True)
        print(f"saved {path}")


if __name__ == "__main__":
    main()
