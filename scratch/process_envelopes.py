import struct
import zlib
from collections import deque
import math

def decode_png(filename):
    with open(filename, 'rb') as f:
        data = f.read()
    pos = 8
    idat = bytearray()
    w, h, colort = 0, 0, 0
    while pos < len(data):
        length, = struct.unpack('>I', data[pos:pos+4])
        ctype = data[pos+4:pos+8]
        if ctype == b'IHDR':
            w, h, bitd, colort = struct.unpack('>IIBB', data[pos+8:pos+8+10])
        elif ctype == b'IDAT':
            idat.extend(data[pos+8:pos+8+length])
        pos += 12 + length
    
    decompressed = zlib.decompress(idat)
    bpp = 3 if colort == 2 else 4
    stride = w * bpp
    raw = bytearray(w * h * bpp)
    
    src_pos = 0
    for y in range(h):
        filter_type = decompressed[src_pos]
        src_pos += 1
        line = decompressed[src_pos:src_pos+stride]
        src_pos += stride
        dst_idx = y * stride
        
        if filter_type == 0:
            raw[dst_idx:dst_idx+stride] = line
        elif filter_type == 1:
            for x in range(stride):
                raw[dst_idx + x] = (line[x] + (raw[dst_idx + x - bpp] if x >= bpp else 0)) & 0xff
        elif filter_type == 2:
            for x in range(stride):
                raw[dst_idx + x] = (line[x] + (raw[dst_idx - stride + x] if y > 0 else 0)) & 0xff
        elif filter_type == 3:
            for x in range(stride):
                left = raw[dst_idx + x - bpp] if x >= bpp else 0
                up = raw[dst_idx - stride + x] if y > 0 else 0
                raw[dst_idx + x] = (line[x] + ((left + up) >> 1)) & 0xff
        elif filter_type == 4:
            for x in range(stride):
                a = raw[dst_idx + x - bpp] if x >= bpp else 0
                b = raw[dst_idx - stride + x] if y > 0 else 0
                c = raw[dst_idx - stride + x - bpp] if (y > 0 and x >= bpp) else 0
                p = a + b - c
                pa = abs(p - a)
                pb = abs(p - b)
                pc = abs(p - c)
                if pa <= pb and pa <= pc: pr = a
                elif pb <= pc: pr = b
                else: pr = c
                raw[dst_idx + x] = (line[x] + pr) & 0xff
                
    return w, h, colort, bpp, raw

def encode_png_rgba(filename, w, h, rgba_data):
    header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    ihdr = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    stride = w * 4
    filtered = bytearray(h * (stride + 1))
    for y in range(h):
        filtered[y * (stride + 1)] = 0
        filtered[y * (stride + 1) + 1 : (y + 1) * (stride + 1)] = rgba_data[y * stride : (y + 1) * stride]
    compressed = zlib.compress(bytes(filtered), 9)
    idat = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    with open(filename, 'wb') as f:
        f.write(header + ihdr + idat + iend)

def process_envelope_open(input_path, output_path):
    print(f'Processing envelope open: {input_path} -> {output_path}')
    w, h, colort, bpp, raw = decode_png(input_path)
    print(f'Loaded open envelope: {w}x{h}, bpp={bpp}')
    
    # 1. Flood fill to detect black background
    bg = bytearray(w * h)
    q = deque()
    
    # Border pixels seed
    for x in range(w):
        for y in [0, h-1]:
            idx = y * w + x
            if not bg[idx] and max(raw[idx*bpp:idx*bpp+3]) <= 20:
                bg[idx] = 1
                q.append((x, y))
    for y in range(h):
        for x in [0, w-1]:
            idx = y * w + x
            if not bg[idx] and max(raw[idx*bpp:idx*bpp+3]) <= 20:
                bg[idx] = 1
                q.append((x, y))
                
    while q:
        cx, cy = q.popleft()
        for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                n_idx = ny * w + nx
                if not bg[n_idx] and max(raw[n_idx*bpp:n_idx*bpp+3]) <= 20:
                    bg[n_idx] = 1
                    q.append((nx, ny))
                    
    print(f'Identified {sum(bg)} background pixels')
    
    # 2. Build RGBA output with smooth edge anti-aliasing
    rgba = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            dst = idx * 4
            src = idx * bpp
            r, g, b = raw[src], raw[src+1], raw[src+2]
            
            if bg[idx]:
                rgba[dst] = 0
                rgba[dst+1] = 0
                rgba[dst+2] = 0
                rgba[dst+3] = 0
            else:
                # Check distance to background
                has_bg_dist1 = False
                for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and bg[ny * w + nx]:
                        has_bg_dist1 = True
                        break
                        
                bri = max(r, g, b)
                if has_bg_dist1 and bri < 210:
                    # Collect nearby non-bg brightness
                    inner_bris = []
                    for dy in range(-2, 3):
                        for dx in range(-2, 3):
                            nx, ny = x + dx, y + dy
                            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
                                nbri = max(raw[(ny*w+nx)*bpp], raw[(ny*w+nx)*bpp+1], raw[(ny*w+nx)*bpp+2])
                                if nbri > 90:
                                    inner_bris.append(nbri)
                    ref_bri = sum(inner_bris) / len(inner_bris) if inner_bris else 220.0
                    alpha = min(1.0, max(0.0, bri / ref_bri))
                    
                    if alpha < 0.04:
                        rgba[dst] = 0
                        rgba[dst+1] = 0
                        rgba[dst+2] = 0
                        rgba[dst+3] = 0
                    else:
                        rgba[dst] = min(255, int(r / alpha))
                        rgba[dst+1] = min(255, int(g / alpha))
                        rgba[dst+2] = min(255, int(b / alpha))
                        rgba[dst+3] = int(alpha * 255)
                else:
                    rgba[dst] = r
                    rgba[dst+1] = g
                    rgba[dst+2] = b
                    rgba[dst+3] = 255
                    
    encode_png_rgba(output_path, w, h, rgba)
    print(f'Successfully wrote transparent open envelope: {output_path}')
    return w, h, rgba

def lum_to_gold_rgb(lum):
    t = max(0.0, min(1.0, (lum - 2.0) / 98.0))
    if t < 0.3:
        u = t / 0.3
        r = 85 + u * (145 - 85)
        g = 60 + u * (108 - 60)
        b = 30 + u * (52 - 30)
    elif t < 0.6:
        u = (t - 0.3) / 0.3
        r = 145 + u * (195 - 145)
        g = 108 + u * (156 - 108)
        b = 52 + u * (82 - 52)
    elif t < 0.85:
        u = (t - 0.6) / 0.25
        r = 195 + u * (235 - 195)
        g = 156 + u * (202 - 156)
        b = 82 + u * (135 - 82)
    else:
        u = (t - 0.85) / 0.15
        r = 235 + u * (255 - 235)
        g = 202 + u * (238 - 202)
        b = 135 + u * (185 - 135)
    return int(r), int(g), int(b)

def process_envelope_closed(input_path, output_path, target_w=1415, target_h=1112):
    print(f'Processing envelope closed: {input_path} -> {output_path}')
    w, h, colort, bpp, raw = decode_png(input_path)
    print(f'Loaded closed envelope: {w}x{h}, bpp={bpp}')
    
    # 1. Transform colors:
    # - Wax seal to rich 3D metallic gold
    # - Paper to radiant white linen (matching open envelope)
    # Wax seal bounding box approx: x in 630..770, y in 690..850
    mod_raw = bytearray(raw)
    
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            a = mod_raw[idx+3]
            if a < 30:
                continue
            r, g, b = mod_raw[idx], mod_raw[idx+1], mod_raw[idx+2]
            
            # Check if this pixel is part of the wax seal
            is_seal_core = (630 <= x <= 775 and 690 <= y <= 855 and r < 155 and g < 100 and b < 100 and (r - g) > 7)
            # Edge of seal (transition)
            is_seal_edge = (620 <= x <= 785 and 680 <= y <= 865 and r < 170 and g < 125 and b < 120 and (r - g) > 12)
            
            if is_seal_core or is_seal_edge:
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                gr, gg, gb = lum_to_gold_rgb(lum)
                if is_seal_core:
                    mod_raw[idx] = gr
                    mod_raw[idx+1] = gg
                    mod_raw[idx+2] = gb
                else:
                    # Blend edge smoothly
                    blend = max(0.0, min(1.0, (170 - r) / 30.0))
                    mod_raw[idx] = int(r * (1 - blend) + gr * blend)
                    mod_raw[idx+1] = int(g * (1 - blend) + gg * blend)
                    mod_raw[idx+2] = int(b * (1 - blend) + gb * blend)
            else:
                # Paper pixel: brighten & tone to radiant warm white linen
                # matching RGB(236, 230, 222) / (248, 245, 240)
                # gentle lift
                nr = min(255, int(r * 1.025 + 5))
                ng = min(255, int(g * 1.035 + 7))
                nb = min(255, int(b * 1.05 + 9))
                mod_raw[idx] = nr
                mod_raw[idx+1] = ng
                mod_raw[idx+2] = nb
                
    # 2. Add subtle gold foil accents along the V-flap fold
    # Flap crease lines run from:
    # Left edge: ~(235, 410) down to Seal top: ~(700, 700)
    # Right edge: ~(1165, 410) down to Seal top: ~(700, 700)
    # Let us render a smooth 2px gold foil shimmer along these two diagonal lines
    def draw_gold_line(x0, y0, x1, y1, thickness=2.2):
        dx = x1 - x0
        dy = y1 - y0
        length = math.hypot(dx, dy)
        ux = dx / length
        uy = dy / length
        # normal
        nx = -uy
        ny = ux
        steps = int(length * 2)
        for s in range(steps):
            t = s / steps
            px = x0 + t * dx
            py = y0 + t * dy
            for w_off in [-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5]:
                ix = int(px + w_off * nx)
                iy = int(py + w_off * ny)
                if 0 <= ix < w and 0 <= iy < h:
                    p_idx = (iy * w + ix) * 4
                    if mod_raw[p_idx+3] > 100:
                        dist = abs(w_off)
                        alpha_gold = max(0.0, min(0.65, (thickness - dist) / thickness * 0.65))
                        # Gold shimmer color: (205, 168, 95)
                        cur_r, cur_g, cur_b = mod_raw[p_idx], mod_raw[p_idx+1], mod_raw[p_idx+2]
                        mod_raw[p_idx] = int(cur_r * (1 - alpha_gold) + 215 * alpha_gold)
                        mod_raw[p_idx+1] = int(cur_g * (1 - alpha_gold) + 175 * alpha_gold)
                        mod_raw[p_idx+2] = int(cur_b * (1 - alpha_gold) + 105 * alpha_gold)

    draw_gold_line(245, 420, 690, 715, thickness=2.5)
    draw_gold_line(1155, 420, 710, 715, thickness=2.5)
    
    # 3. Resample and Align to exact matching 1415x1112 canvas:
    # Target body: left=181, right=1229 (width=1049px), bottom=1086
    # Original body: left=233, right=1167 (width=935px), bottom=1000
    orig_left = 233.0
    orig_right = 1167.0
    orig_w_body = orig_right - orig_left + 1.0 # 935.0
    orig_bottom = 1000.0
    
    target_left = 181.0
    target_right = 1229.0
    target_w_body = target_right - target_left + 1.0 # 1049.0
    target_bottom = 1086.0
    
    scale = target_w_body / orig_w_body # 1.121925
    
    out_rgba = bytearray(target_w * target_h * 4)
    
    # Bilinear resampling from mod_raw into out_rgba
    for ty in range(target_h):
        # sy corresponding to ty:
        # (ty - target_bottom) = (sy - orig_bottom) * scale
        sy = orig_bottom + (ty - target_bottom) / scale
        if not (-1 <= sy <= h):
            continue
            
        for tx in range(target_w):
            # sx corresponding to tx:
            # (tx - target_left) = (sx - orig_left) * scale
            sx = orig_left + (tx - target_left) / scale
            if not (-1 <= sx <= w):
                continue
                
            # Bilinear interpolation
            x0 = int(math.floor(sx))
            y0 = int(math.floor(sy))
            x1 = x0 + 1
            y1 = y0 + 1
            fx = sx - x0
            fy = sy - y0
            
            # Clamp bounds
            x0_c = max(0, min(w - 1, x0))
            x1_c = max(0, min(w - 1, x1))
            y0_c = max(0, min(h - 1, y0))
            y1_c = max(0, min(h - 1, y1))
            
            p00 = (y0_c * w + x0_c) * 4
            p10 = (y0_c * w + x1_c) * 4
            p01 = (y1_c * w + x0_c) * 4
            p11 = (y1_c * w + x1_c) * 4
            
            w00 = (1.0 - fx) * (1.0 - fy)
            w10 = fx * (1.0 - fy)
            w01 = (1.0 - fx) * fy
            w11 = fx * fy
            
            a = (mod_raw[p00+3] * w00 + mod_raw[p10+3] * w10 + mod_raw[p01+3] * w01 + mod_raw[p11+3] * w11)
            
            # Check edge bounds
            if sx < 0 or sx >= w - 1 or sy < 0 or sy >= h - 1:
                # outside original image area
                a *= max(0.0, min(1.0, 1.0 - max(0.0, -sx, sx - (w - 1), -sy, sy - (h - 1))))
                
            if a < 1.0:
                continue
                
            r = (mod_raw[p00] * w00 + mod_raw[p10] * w10 + mod_raw[p01] * w01 + mod_raw[p11] * w11)
            g = (mod_raw[p00+1] * w00 + mod_raw[p10+1] * w10 + mod_raw[p01+1] * w01 + mod_raw[p11+1] * w11)
            b = (mod_raw[p00+2] * w00 + mod_raw[p10+2] * w10 + mod_raw[p01+2] * w01 + mod_raw[p11+2] * w11)
            
            out_idx = (ty * target_w + tx) * 4
            out_rgba[out_idx] = min(255, max(0, int(r)))
            out_rgba[out_idx+1] = min(255, max(0, int(g)))
            out_rgba[out_idx+2] = min(255, max(0, int(b)))
            out_rgba[out_idx+3] = min(255, max(0, int(a)))
            
    encode_png_rgba(output_path, target_w, target_h, out_rgba)
    print(f'Successfully wrote scaled & styled closed envelope: {output_path}')
    return target_w, target_h, out_rgba

if __name__ == '__main__':
    open_in = 'assets/images/envelope/backup/20261029/envelope open.png'
    open_out = 'assets/images/envelope/envelope open.png'
    process_envelope_open(open_in, open_out)
    
    closed_in = 'assets/images/envelope/backup/20261029/envelope closed.png'
    closed_out = 'assets/images/envelope/envelope closed.png'
    process_envelope_closed(closed_in, closed_out, target_w=1415, target_h=1112)
    print('ALL DONE!')
