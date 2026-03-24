"""
Fingerprint Local Scanner Service
===================================
Run this on the Windows PC that has the Futronics USB scanner connected.
It exposes a local HTTP API on http://localhost:8585 that the web app talks to.

Usage:
    pip install flask flask-cors numpy opencv-python
    python local_scanner_service.py

Endpoints:
    POST /scanner/init         - Initialize the scanner
    POST /scanner/start_preview - Start live preview
    GET  /scanner/get_preview  - Get latest preview frame (base64 PNG)
    POST /scanner/stop_preview - Stop live preview
    POST /scanner/capture      - Capture current frame, return base64 image
    GET  /scanner/status       - Check if scanner is ready
"""

import os
import sys
import ctypes
import numpy as np
import cv2
import time
import base64
import threading
import queue
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
# Allow requests from any origin (the deployed web app)
CORS(app)


class LocalFingerprintScanner:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        dll_folder = os.path.join(base_dir, 'futronics')
        dll_path = os.path.join(dll_folder, 'ftrScanAPI.dll')

        if not os.path.exists(dll_path):
            raise FileNotFoundError(
                f"Fingerprint DLL not found at: {dll_path}\n"
                f"Make sure the 'futronics' folder with DLLs is next to this script."
            )

        self.dll_path = dll_path
        self.ftr = None
        self.device = None
        self.width = 320
        self.height = 480
        self.img_size = 320 * 480
        self.is_previewing = False
        self.preview_thread = None
        self.preview_queue = queue.Queue()

        # Constants
        self.FTR_ERROR_EMPTY_FRAME = 4306
        self.FTR_ERROR_MOVABLE_FINGER = 0x20000001
        self.FTR_ERROR_NO_FRAME = 0x20000002

    def initialize_scanner(self):
        try:
            self.ftr = ctypes.WinDLL(self.dll_path)

            self.ftr.ftrScanOpenDevice.restype = ctypes.c_void_p
            self.ftr.ftrScanCloseDevice.argtypes = [ctypes.c_void_p]
            self.ftr.ftrScanIsFingerPresent.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
            self.ftr.ftrScanIsFingerPresent.restype = ctypes.c_bool
            self.ftr.ftrScanGetImage2.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
            self.ftr.ftrScanGetImage2.restype = ctypes.c_bool
            self.ftr.ftrScanGetLastError.restype = ctypes.c_int

            self.device = self.ftr.ftrScanOpenDevice()
            if not self.device:
                return False, "Could not open the fingerprint scanner device."

            return True, "Scanner initialized successfully."
        except Exception as e:
            return False, f"Scanner initialization failed: {str(e)}"

    def start_live_preview(self):
        if self.is_previewing:
            return
        self.is_previewing = True
        self.preview_thread = threading.Thread(target=self._preview_worker)
        self.preview_thread.daemon = True
        self.preview_thread.start()

    def stop_live_preview(self):
        self.is_previewing = False
        if self.preview_thread:
            self.preview_thread.join(timeout=1)

    def _preview_worker(self):
        buf = (ctypes.c_ubyte * self.img_size)()
        buf_ptr = ctypes.cast(buf, ctypes.c_void_p)

        while self.is_previewing and self.device:
            try:
                if self.ftr.ftrScanIsFingerPresent(self.device, None):
                    if self.ftr.ftrScanGetImage2(self.device, 4, buf_ptr):
                        img = np.ctypeslib.as_array(buf).reshape((self.height, self.width))
                        _, encoded = cv2.imencode('.png', img)
                        img_b64 = base64.b64encode(encoded).decode('utf-8')

                        # Keep only the latest frame
                        try:
                            self.preview_queue.get_nowait()
                        except queue.Empty:
                            pass
                        self.preview_queue.put(img_b64)

                time.sleep(0.1)
            except Exception as e:
                print(f"Preview error: {e}")
                break

    def get_latest_preview(self):
        try:
            return self.preview_queue.get_nowait()
        except queue.Empty:
            return None

    def capture_frame(self):
        """Capture a single frame and return it as a base64 PNG string."""
        if not self.device:
            return False, "Scanner not initialized.", None

        try:
            buf = (ctypes.c_ubyte * self.img_size)()
            buf_ptr = ctypes.cast(buf, ctypes.c_void_p)

            if self.ftr.ftrScanGetImage2(self.device, 4, buf_ptr):
                img = np.ctypeslib.as_array(buf).reshape((self.height, self.width))
                _, encoded = cv2.imencode('.png', img)
                img_b64 = base64.b64encode(encoded).decode('utf-8')
                return True, "Frame captured.", img_b64
            else:
                return False, "Failed to capture frame.", None
        except Exception as e:
            return False, f"Capture error: {str(e)}", None

    def close_scanner(self):
        self.stop_live_preview()
        if self.device and self.ftr:
            self.ftr.ftrScanCloseDevice(self.device)
            self.device = None


# ---------------------------------------------------------------------------
#  Global scanner instance
# ---------------------------------------------------------------------------
scanner = LocalFingerprintScanner()


# ---------------------------------------------------------------------------
#  API routes
# ---------------------------------------------------------------------------
@app.route('/scanner/status', methods=['GET'])
def scanner_status():
    return jsonify({
        'success': True,
        'initialized': scanner.device is not None,
        'previewing': scanner.is_previewing
    })


@app.route('/scanner/init', methods=['POST'])
def init_scanner():
    if scanner.device:
        return jsonify({'success': True, 'message': 'Scanner already initialized.'})
    ok, msg = scanner.initialize_scanner()
    return jsonify({'success': ok, 'message': msg})


@app.route('/scanner/start_preview', methods=['POST'])
def start_preview():
    if not scanner.device:
        ok, msg = scanner.initialize_scanner()
        if not ok:
            return jsonify({'success': False, 'message': msg})
    scanner.start_live_preview()
    return jsonify({'success': True, 'message': 'Live preview started.'})


@app.route('/scanner/get_preview', methods=['GET'])
def get_preview():
    frame = scanner.get_latest_preview()
    if frame:
        return jsonify({'success': True, 'image': frame})
    return jsonify({'success': False, 'message': 'No preview available.'})


@app.route('/scanner/stop_preview', methods=['POST'])
def stop_preview():
    scanner.stop_live_preview()
    return jsonify({'success': True, 'message': 'Preview stopped.'})


@app.route('/scanner/capture', methods=['POST'])
def capture():
    ok, msg, img_b64 = scanner.capture_frame()
    if ok:
        return jsonify({'success': True, 'message': msg, 'image': img_b64})
    return jsonify({'success': False, 'message': msg})


# ---------------------------------------------------------------------------
#  Main
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    print("=" * 60)
    print("  Fingerprint Local Scanner Service")
    print("  Running on http://localhost:8585")
    print("  Keep this window open while using the web app.")
    print("=" * 60)
    app.run(host='127.0.0.1', port=8585, debug=False)
