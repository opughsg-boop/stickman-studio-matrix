#!/usr/bin/env python3
"""Parallel Headless Chromium CDP renderer for diorama-studio (zero network/file:// navigation)."""
import argparse, base64, concurrent.futures, json, os, shutil, socket, struct, subprocess, sys, time, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class CDP:
    def __init__(self, ws_url):
        assert ws_url.startswith('ws://')
        host_port, path = ws_url[5:].split('/', 1)
        host, port = host_port.split(':')
        self.s = socket.create_connection((host, int(port)), timeout=120)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET /{path} HTTP/1.1\r\nHost: {host_port}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        self.s.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self.id = 0

    def _send_frame(self, payload: bytes):
        mask = os.urandom(4)
        n = len(payload)
        hdr = bytearray([0x81])
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126)
            hdr.extend(struct.pack('>H', n))
        else:
            hdr.append(0x80 | 127)
            hdr.extend(struct.pack('>Q', n))
        hdr.extend(mask)
        masked = bytes(b ^ mask[i & 3] for i, b in enumerate(payload))
        self.s.sendall(bytes(hdr) + masked)

    def _recv_exact(self, n):
        buf = bytearray()
        while len(buf) < n:
            chunk = self.s.recv(n - len(buf))
            if not chunk:
                raise EOFError("WebSocket closed")
            buf.extend(chunk)
        return bytes(buf)

    def _recv_frame(self):
        msg = bytearray()
        while True:
            b1, b2 = self._recv_exact(2)
            fin = b1 & 0x80
            op = b1 & 0x0F
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack('>H', self._recv_exact(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._recv_exact(8))[0]
            if b2 & 0x80:
                mask = self._recv_exact(4)
                data = bytes(b ^ mask[i & 3] for i, b in enumerate(self._recv_exact(n)))
            else:
                data = self._recv_exact(n)
            if op == 8:
                raise EOFError("WS close")
            if op == 9:
                continue
            msg.extend(data)
            if fin:
                return msg.decode('utf-8')

    def call(self, method, params=None):
        self.id += 1
        cid = self.id
        self._send_frame(json.dumps({"id": cid, "method": method, "params": params or {}}).encode())
        while True:
            resp = json.loads(self._recv_frame())
            if resp.get("id") == cid:
                if "error" in resp:
                    raise RuntimeError(resp["error"])
                return resp.get("result", {})

    def eval(self, expr):
        res = self.call("Runtime.evaluate", {
            "expression": expr,
            "awaitPromise": True,
            "returnByValue": True
        })
        if "exceptionDetails" in res:
            raise RuntimeError(f"JS exception: {res['exceptionDetails']}")
        return res.get("result", {}).get("value")

    def close(self):
        self.s.close()

def b64_bytes(b: bytes):
    return base64.b64encode(b).decode("ascii")

def b64_file(path):
    with open(path, "rb") as f:
        return b64_bytes(f.read())

def build_html():
    three_b64 = b64_file(os.path.join(ROOT, "node_modules", "three", "build", "three.module.js"))
    assets_b64 = b64_file(os.path.join(ROOT, "renderer", "assets_lib.js"))
    with open(os.path.join(ROOT, "renderer", "scene.js"), "rb") as f:
        scene_src = f.read().replace(b"'./assets_lib.js'", b"'assets_lib'")
    scene_b64 = b64_bytes(scene_src)
    font_ar_b64 = b64_file("/usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf")
    font_en_b64 = b64_file("/usr/share/fonts/truetype/noto/NotoSans-BoldItalic.ttf")
    return f"""<!doctype html>
<html><head><meta charset="utf-8">
<style>
@font-face{{font-family:Cap;src:url(data:font/truetype;base64,{font_en_b64}) format('truetype');}}
@font-face{{font-family:CapAr;src:url(data:font/truetype;base64,{font_ar_b64}) format('truetype');}}
html,body{{margin:0;background:#000;overflow:hidden}}
canvas{{display:block}}
</style>
<script type="importmap">{{"imports":{{"three":"data:text/javascript;base64,{three_b64}","assets_lib":"data:text/javascript;base64,{assets_b64}"}}}}</script>
</head><body>
<script type="module" src="data:text/javascript;base64,{scene_b64}"></script>
</body></html>"""

def launch_worker(worker_id, html, plan, w, h):
    s_tmp = socket.socket()
    s_tmp.bind(("127.0.0.1", 0))
    cdp_port = s_tmp.getsockname()[1]
    s_tmp.close()
    user_dir = f"/tmp/chr_diorama_{os.getpid()}_{worker_id}"
    os.makedirs(user_dir, exist_ok=True)
    proc = subprocess.Popen([
        "/usr/bin/chromium",
        "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl",
        f"--remote-debugging-port={cdp_port}",
        f"--user-data-dir={user_dir}",
        f"--window-size={w},{h}",
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ws_url = None
    for _ in range(80):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{cdp_port}/json/list", timeout=1) as r:
                pages = json.loads(r.read().decode())
                if pages:
                    ws_url = pages[0]["webSocketDebuggerUrl"]
                    break
        except Exception:
            time.sleep(0.15)
    if not ws_url:
        proc.kill()
        raise RuntimeError(f"Worker {worker_id}: Chromium CDP failed to start")
    cdp = CDP(ws_url)
    cdp.call("Page.enable")
    cdp.call("Runtime.enable")
    frame_tree = cdp.call("Page.getFrameTree")
    frame_id = frame_tree["frameTree"]["frame"]["id"]
    cdp.call("Page.setDocumentContent", {"frameId": frame_id, "html": html})
    for _ in range(100):
        if cdp.eval("!!window.__ready"):
            break
        time.sleep(0.05)
    cdp.eval(f"window.setup({json.dumps(plan)}, {{ width: {w}, height: {h} }})")
    return proc, cdp, user_dir

def close_worker(proc, cdp, user_dir):
    try:
        cdp.close()
    except Exception:
        pass
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except Exception:
        proc.kill()
    shutil.rmtree(user_dir, ignore_errors=True)

def render_chunk(worker_id, indices, html, plan, w, h, fps, frames_dir, quality):
    todo = [i for i in indices if not (os.path.exists(os.path.join(frames_dir, f"f{i:05d}.jpg")) and os.path.getsize(os.path.join(frames_dir, f"f{i:05d}.jpg")) >= 1000)]
    if not todo:
        return 0
    proc, cdp, user_dir = launch_worker(worker_id, html, plan, w, h)
    t0 = time.time()
    try:
        for k, f_idx in enumerate(todo):
            b64 = cdp.eval(f"window.renderAt({f_idx / fps:.5f}, {quality})")
            with open(os.path.join(frames_dir, f"f{f_idx:05d}.jpg"), "wb") as f:
                f.write(base64.b64decode(b64))
            if k % 60 == 0 or k == len(todo) - 1:
                print(f"[w{worker_id}] {k + 1}/{len(todo)} ({time.time() - t0:.1f}s)", flush=True)
    finally:
        close_worker(proc, cdp, user_dir)
    return len(todo)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("audio")
    ap.add_argument("out_dir")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--w", type=int, default=1080)
    ap.add_argument("--h", type=int, default=1920)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=-1)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--quality", type=float, default=0.90)
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    with open(args.plan, encoding="utf-8") as f:
        plan = json.load(f)
    if args.preview:
        args.w, args.h = 360, 640

    html = build_html()

    if args.preview:
        proc, cdp, user_dir = launch_worker(0, html, plan, args.w, args.h)
        try:
            frames_dir = os.path.join(args.out_dir, "_prev")
            os.makedirs(frames_dir, exist_ok=True)
            for i, b in enumerate(plan["beats"]):
                t = (b["start"] + b["end"]) / 2.0
                b64 = cdp.eval(f"window.renderAt({t:.4f}, 0.85)")
                with open(os.path.join(frames_dir, f"b{i:02d}.jpg"), "wb") as f:
                    f.write(base64.b64decode(b64))
            n = len(plan["beats"])
            cols = min(5, n)
            rows = (n + cols - 1) // cols
            sheet = os.path.join(args.out_dir, "sheet_preview.jpg")
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", os.path.join(frames_dir, "b%02d.jpg"),
                "-vf", f"scale=240:-1,tile={cols}x{rows}", "-frames:v", "1", sheet
            ], check=True)
            print("preview ->", sheet)
        finally:
            close_worker(proc, cdp, user_dir)
        return

    total = int(round(plan["duration"] * args.fps))
    f_start = max(0, args.start)
    f_end = total if args.end < 0 else min(total, args.end)
    frames_dir = os.path.join(args.out_dir, "_frames")
    os.makedirs(frames_dir, exist_ok=True)

    indices = list(range(f_start, f_end))
    nw = max(1, min(args.workers, len(indices)))
    chunks = [indices[i::nw] for i in range(nw)]

    t_all = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=nw) as ex:
        futs = [ex.submit(render_chunk, wi, ch, html, plan, args.w, args.h, args.fps, frames_dir, args.quality) for wi, ch in enumerate(chunks) if ch]
        for fut in concurrent.futures.as_completed(futs):
            fut.result()
    print(f"[render] chunk {f_start}..{f_end} done in {time.time() - t_all:.1f}s ({nw} workers)", flush=True)

    if f_end < total:
        return

    raw_mp4 = os.path.join(args.out_dir, "_video_raw.mp4")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y",
        "-framerate", str(args.fps), "-i", os.path.join(frames_dir, "f%05d.jpg"),
        "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-pix_fmt", "yuv420p", raw_mp4
    ], check=True)

    final_mp4 = os.path.join(args.out_dir, "final.mp4")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", raw_mp4, "-i", args.audio,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-shortest", "-movflags", "+faststart", final_mp4
    ], check=True)
    print("final ->", final_mp4)

if __name__ == "__main__":
    main()
