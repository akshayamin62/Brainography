"""
Brainography Fingerprint Scanner Service
=========================================
Production version. Works both as a plain Python script (development)
and as a PyInstaller-bundled .exe / .app (distribution to clients).

API (same as local_scanner_service.py — no frontend changes needed):
    GET  /scanner/status
    POST /scanner/init
    POST /scanner/start_preview
    GET  /scanner/get_preview
    POST /scanner/stop_preview
    POST /scanner/capture

When running as a frozen .exe on Windows, a system tray icon is shown
so clients can see the service is alive.
"""

import sys
import os
import platform
import ctypes
import threading
import queue
import time
import base64
import logging

import numpy as np
import cv2
from flask import Flask, jsonify
from flask_cors import CORS

# ── Environment detection ────────────────────────────────────────────────────

IS_FROZEN = getattr(sys, 'frozen', False)

# MEIPASS: where PyInstaller extracts bundled files (DLLs, etc.)
MEIPASS = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))

# APP_DIR: directory of the running .exe (persistent — for logs)
APP_DIR = os.path.dirname(sys.executable) if IS_FROZEN else os.path.dirname(os.path.abspath(__file__))

IS_WIN = platform.system() == 'Windows'
IS_MAC = platform.system() == 'Darwin'

# ── Logging ───────────────────────────────────────────────────────────────────

log_path = os.path.join(APP_DIR, 'scanner_service.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler(log_path, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger('brainography.scanner')


# ── Fingerprint Scanner ───────────────────────────────────────────────────────

class FingerprintScanner:
    def __init__(self):
        self.lib = None
        self.device = None
        self.width = 320
        self.height = 480
        self.img_size = 320 * 480
        self.is_previewing = False
        self.preview_thread = None
        # maxsize=1 so we never serve a stale old frame
        self.preview_queue = queue.Queue(maxsize=1)

    def _lib_path(self) -> str | None:
        if IS_WIN:
            # Futronic Windows SDK
            return os.path.join(MEIPASS, 'futronics', 'ftrScanAPI.dll')
        if IS_MAC:
            # Futronic Mac SDK (libScanAPI.dylib depends on ftrapi.dylib)
            # Load ftrapi.dylib first so libScanAPI.dylib can find it
            dep = os.path.join(MEIPASS, 'futronics', 'ftrapi.dylib')
            if os.path.exists(dep):
                ctypes.CDLL(dep)
            return os.path.join(MEIPASS, 'futronics', 'libScanAPI.dylib')
        return None

    def initialize(self) -> tuple[bool, str]:
        path = self._lib_path()
        if not path or not os.path.exists(path):
            msg = (
                f"Scanner library not found at: {path}\n"
                "Windows: place ftrScanAPI.dll in the 'futronics/' folder.\n"
                "Mac: place libftrscan.dylib in the 'futronics/' folder."
            )
            log.error(msg)
            return False, msg

        try:
            # Windows uses WinDLL (stdcall), Mac uses CDLL (cdecl)
            self.lib = ctypes.WinDLL(path) if IS_WIN else ctypes.CDLL(path, use_errno=True)

            # Declare the Futronic API function signatures
            self.lib.ftrScanOpenDevice.restype = ctypes.c_void_p
            self.lib.ftrScanCloseDevice.argtypes = [ctypes.c_void_p]
            self.lib.ftrScanIsFingerPresent.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
            self.lib.ftrScanIsFingerPresent.restype = ctypes.c_bool
            self.lib.ftrScanGetImage2.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
            self.lib.ftrScanGetImage2.restype = ctypes.c_bool

            self.device = self.lib.ftrScanOpenDevice()
            if not self.device:
                msg = "Scanner device not found. Is the Futronic USB device connected?"
                log.warning(msg)
                return False, msg

            log.info("Futronic scanner initialized successfully")
            return True, "Scanner initialized."

        except Exception as exc:
            log.error(f"Scanner init failed: {exc}")
            return False, str(exc)

    # ── Preview ──────────────────────────────────────────────────────────────

    def start_preview(self):
        if self.is_previewing:
            return
        self.is_previewing = True
        self.preview_thread = threading.Thread(target=self._preview_worker, daemon=True)
        self.preview_thread.start()
        log.info("Live preview started")

    def stop_preview(self):
        self.is_previewing = False
        if self.preview_thread:
            self.preview_thread.join(timeout=2)
            self.preview_thread = None
        log.info("Live preview stopped")

    def _preview_worker(self):
        buf = (ctypes.c_ubyte * self.img_size)()
        ptr = ctypes.cast(buf, ctypes.c_void_p)

        while self.is_previewing and self.device:
            try:
                if self.lib.ftrScanIsFingerPresent(self.device, None):
                    if self.lib.ftrScanGetImage2(self.device, 4, ptr):
                        img = np.ctypeslib.as_array(buf).reshape((self.height, self.width))
                        _, enc = cv2.imencode('.png', img)
                        frame = base64.b64encode(enc).decode('utf-8')
                        # Replace stale frame — always serve the freshest one
                        try:
                            self.preview_queue.get_nowait()
                        except queue.Empty:
                            pass
                        self.preview_queue.put_nowait(frame)
                time.sleep(0.1)   # ~10 fps
            except Exception as exc:
                log.error(f"Preview worker error: {exc}")
                break

    def get_latest_preview(self) -> str | None:
        try:
            return self.preview_queue.get_nowait()
        except queue.Empty:
            return None

    # ── Single capture ────────────────────────────────────────────────────────

    def capture(self) -> tuple[bool, str, str | None]:
        if not self.device:
            return False, "Scanner not initialized.", None
        try:
            buf = (ctypes.c_ubyte * self.img_size)()
            ptr = ctypes.cast(buf, ctypes.c_void_p)
            if self.lib.ftrScanGetImage2(self.device, 4, ptr):
                img = np.ctypeslib.as_array(buf).reshape((self.height, self.width))
                _, enc = cv2.imencode('.png', img)
                return True, "Frame captured.", base64.b64encode(enc).decode('utf-8')
            return False, "Capture failed — try again.", None
        except Exception as exc:
            return False, str(exc), None

    def close(self):
        self.stop_preview()
        if self.device and self.lib:
            self.lib.ftrScanCloseDevice(self.device)
            self.device = None
        log.info("Scanner closed")


# ── Global scanner instance ───────────────────────────────────────────────────

scanner = FingerprintScanner()


# ── Flask HTTP API ────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)   # Allow cross-origin requests from the web app (deployed on Hostinger)


@app.route('/scanner/status', methods=['GET'])
def scanner_status():
    return jsonify({
        'success': True,
        'initialized': scanner.device is not None,
        'previewing': scanner.is_previewing,
    })


@app.route('/scanner/init', methods=['POST'])
def init_scanner():
    if scanner.device:
        return jsonify({'success': True, 'message': 'Scanner already initialized.'})
    ok, msg = scanner.initialize()
    return jsonify({'success': ok, 'message': msg})


@app.route('/scanner/start_preview', methods=['POST'])
def start_preview():
    if not scanner.device:
        ok, msg = scanner.initialize()
        if not ok:
            return jsonify({'success': False, 'message': msg})
    scanner.start_preview()
    return jsonify({'success': True, 'message': 'Live preview started.'})


@app.route('/scanner/get_preview', methods=['GET'])
def get_preview():
    frame = scanner.get_latest_preview()
    if frame:
        return jsonify({'success': True, 'image': frame})
    return jsonify({'success': False, 'message': 'No preview frame available yet.'})


@app.route('/scanner/stop_preview', methods=['POST'])
def stop_preview():
    scanner.stop_preview()
    return jsonify({'success': True, 'message': 'Preview stopped.'})


@app.route('/scanner/capture', methods=['POST'])
def capture():
    ok, msg, img = scanner.capture()
    if ok:
        return jsonify({'success': True, 'message': msg, 'image': img})
    return jsonify({'success': False, 'message': msg})


# ── System tray (Windows frozen builds only) ──────────────────────────────────

def _run_tray():
    """Show a green dot in the Windows system tray. Runs on the main thread."""
    try:
        import pystray
        from PIL import Image, ImageDraw

        def _make_icon_image(hex_color: str) -> Image.Image:
            r, g, b = int(hex_color[1:3], 16), int(hex_color[3:5], 16), int(hex_color[5:7], 16)
            img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
            ImageDraw.Draw(img).ellipse([4, 4, 60, 60], fill=(r, g, b, 255))
            return img

        def _on_exit(icon, _item):
            log.info("Exit requested from system tray")
            icon.stop()
            scanner.close()
            os._exit(0)

        menu = pystray.Menu(
            pystray.MenuItem('Brainography Scanner', None, enabled=False),
            pystray.MenuItem('Running on port 8585', None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Exit', _on_exit),
        )

        icon = pystray.Icon(
            name='BrainographyScanner',
            icon=_make_icon_image('#22c55e'),    # green dot
            title='Brainography Scanner\nRunning on :8585',
            menu=menu,
        )
        log.info("System tray icon active")
        icon.run()   # blocks until exit

    except ImportError:
        # pystray or Pillow not available — fall back to sleeping main thread
        log.warning("pystray/Pillow not available — running without system tray")
        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            pass


# ── Entry point ───────────────────────────────────────────────────────────────

def _run_flask():
    log.info("Starting Brainography Scanner Service on http://127.0.0.1:8585")
    app.run(host='127.0.0.1', port=8585, debug=False, use_reloader=False, threaded=True)


if __name__ == '__main__':
    # Flask always runs in a daemon thread so the main thread is free
    flask_thread = threading.Thread(target=_run_flask, daemon=True)
    flask_thread.start()

    if IS_WIN and IS_FROZEN:
        # Frozen Windows exe: show system tray icon (blocks main thread)
        _run_tray()
    else:
        # Development / Mac: just block and wait for Ctrl+C
        log.info("Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            log.info("Shutting down...")
            scanner.close()
