"""
Fingerprint Scanner - Windows Service
========================================
Installs the local scanner service as a Windows background service
that starts automatically on boot.

SETUP (run once as Administrator):
    pip install pywin32 flask flask-cors numpy opencv-python
    python scanner_windows_service.py install
    python scanner_windows_service.py start

UNINSTALL:
    python scanner_windows_service.py stop
    python scanner_windows_service.py remove

MANAGE:
    Open Windows Services (services.msc) → "Fingerprint Scanner Service"
"""

import sys
import os
import threading
import win32serviceutil
import win32service
import win32event
import servicemanager

# Add the project directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)


class FingerprintScannerService(win32serviceutil.ServiceFramework):
    _svc_name_ = "FingerprintScannerSvc"
    _svc_display_name_ = "Fingerprint Scanner Service"
    _svc_description_ = (
        "Local fingerprint scanner bridge service. "
        "Runs on port 8585 and allows the Futronics USB scanner "
        "to communicate with the web application."
    )

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.flask_thread = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, "")
        )
        self._run_flask()
        win32event.WaitForSingleObject(self.stop_event, win32event.INFINITE)

    def _run_flask(self):
        """Start the Flask scanner service in a daemon thread."""
        self.flask_thread = threading.Thread(target=self._flask_worker, daemon=True)
        self.flask_thread.start()

    def _flask_worker(self):
        # Import here so service DLL loading happens inside the thread
        import ctypes
        import numpy as np
        import cv2
        import time
        import base64
        import queue
        from flask import Flask, jsonify, request
        from flask_cors import CORS

        app = Flask(__name__)
        CORS(app)

        # ── Scanner class (same logic as local_scanner_service.py) ──────────
        class LocalFingerprintScanner:
            def __init__(self):
                dll_folder = os.path.join(BASE_DIR, 'futronics')
                dll_path = os.path.join(dll_folder, 'ftrScanAPI.dll')
                self.dll_path = dll_path if os.path.exists(dll_path) else None
                self.ftr = None
                self.device = None
                self.width = 320
                self.height = 480
                self.img_size = 320 * 480
                self.is_previewing = False
                self.preview_thread = None
                self.preview_queue = queue.Queue()

            def initialize_scanner(self):
                if not self.dll_path:
                    return False, "ftrScanAPI.dll not found in 'futronics' folder."
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
                        return False, "Could not open fingerprint scanner device."
                    return True, "Scanner initialized."
                except Exception as e:
                    return False, f"Init failed: {e}"

            def start_live_preview(self):
                if self.is_previewing:
                    return
                self.is_previewing = True
                t = threading.Thread(target=self._preview_worker, daemon=True)
                t.start()

            def stop_live_preview(self):
                self.is_previewing = False

            def _preview_worker(self):
                buf = (ctypes.c_ubyte * self.img_size)()
                buf_ptr = ctypes.cast(buf, ctypes.c_void_p)
                while self.is_previewing and self.device:
                    try:
                        if self.ftr.ftrScanIsFingerPresent(self.device, None):
                            if self.ftr.ftrScanGetImage2(self.device, 4, buf_ptr):
                                img = np.ctypeslib.as_array(buf).reshape((self.height, self.width))
                                _, enc = cv2.imencode('.png', img)
                                b64 = base64.b64encode(enc).decode('utf-8')
                                try:
                                    self.preview_queue.get_nowait()
                                except queue.Empty:
                                    pass
                                self.preview_queue.put(b64)
                        time.sleep(0.1)
                    except Exception:
                        break

            def get_latest_preview(self):
                try:
                    return self.preview_queue.get_nowait()
                except queue.Empty:
                    return None

            def capture_frame(self):
                if not self.device:
                    return False, "Scanner not initialised.", None
                try:
                    buf = (ctypes.c_ubyte * self.img_size)()
                    buf_ptr = ctypes.cast(buf, ctypes.c_void_p)
                    if self.ftr.ftrScanGetImage2(self.device, 4, buf_ptr):
                        img = np.ctypeslib.as_array(buf).reshape((self.height, self.width))
                        _, enc = cv2.imencode('.png', img)
                        b64 = base64.b64encode(enc).decode('utf-8')
                        return True, "Captured.", b64
                    return False, "Capture failed.", None
                except Exception as e:
                    return False, str(e), None

        scanner = LocalFingerprintScanner()

        # ── Routes ──────────────────────────────────────────────────────────
        @app.route('/scanner/status', methods=['GET'])
        def status():
            return jsonify({'success': True, 'initialized': scanner.device is not None,
                            'previewing': scanner.is_previewing})

        @app.route('/scanner/init', methods=['POST'])
        def init():
            if scanner.device:
                return jsonify({'success': True, 'message': 'Already initialized.'})
            ok, msg = scanner.initialize_scanner()
            return jsonify({'success': ok, 'message': msg})

        @app.route('/scanner/start_preview', methods=['POST'])
        def start_preview():
            if not scanner.device:
                ok, msg = scanner.initialize_scanner()
                if not ok:
                    return jsonify({'success': False, 'message': msg})
            scanner.start_live_preview()
            return jsonify({'success': True, 'message': 'Preview started.'})

        @app.route('/scanner/get_preview', methods=['GET'])
        def get_preview():
            frame = scanner.get_latest_preview()
            if frame:
                return jsonify({'success': True, 'image': frame})
            return jsonify({'success': False, 'message': 'No preview.'})

        @app.route('/scanner/stop_preview', methods=['POST'])
        def stop_preview():
            scanner.stop_live_preview()
            return jsonify({'success': True, 'message': 'Preview stopped.'})

        @app.route('/scanner/capture', methods=['POST'])
        def capture():
            ok, msg, img = scanner.capture_frame()
            if ok:
                return jsonify({'success': True, 'message': msg, 'image': img})
            return jsonify({'success': False, 'message': msg})

        # Start Flask (blocking)
        app.run(host='127.0.0.1', port=8585, debug=False, use_reloader=False)


# ── Entry point ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if len(sys.argv) == 1:
        # No arguments — show usage
        print("""
Fingerprint Scanner Windows Service
=====================================
Run these commands in a terminal (as Administrator):

  Install & start:
    python scanner_windows_service.py install
    python scanner_windows_service.py start

  Stop & remove:
    python scanner_windows_service.py stop
    python scanner_windows_service.py remove

  Check status:
    python scanner_windows_service.py status

After install, the service starts automatically on every Windows boot.
You can also manage it from: Start → Services (services.msc)
        """)
    else:
        win32serviceutil.HandleCommandLine(FingerprintScannerService)
