import os
import sys
import platform
import time
import base64
from datetime import datetime
import threading
import queue

# Platform check — hardware scanner only works on Windows
IS_WINDOWS = platform.system() == 'Windows'

if IS_WINDOWS:
    import ctypes
    try:
        import numpy as np
        import cv2
    except ImportError:
        np = None
        cv2 = None
else:
    ctypes = None
    np = None
    cv2 = None


class FingerprintScanner:
    def __init__(self):
        self.available = False
        self.dll_path = None
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

        if IS_WINDOWS:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            dll_folder = os.path.join(base_dir, 'futronics')
            dll_path = os.path.join(dll_folder, 'ftrScanAPI.dll')
            if os.path.exists(dll_path):
                self.dll_path = dll_path
                self.available = True

    def initialize_scanner(self):
        if not self.available:
            return False, "Fingerprint scanner is not available on this platform."
        try:
            self.ftr = ctypes.WinDLL(self.dll_path)
            
            # Function declarations
            self.ftr.ftrScanOpenDevice.restype = ctypes.c_void_p
            self.ftr.ftrScanCloseDevice.argtypes = [ctypes.c_void_p]
            self.ftr.ftrScanIsFingerPresent.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
            self.ftr.ftrScanIsFingerPresent.restype = ctypes.c_bool
            self.ftr.ftrScanGetImage2.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
            self.ftr.ftrScanGetImage2.restype = ctypes.c_bool
            self.ftr.ftrScanGetLastError.restype = ctypes.c_int
            
            # Open device
            self.device = self.ftr.ftrScanOpenDevice()
            if not self.device:
                return False, "Could not open the fingerprint scanner device."
            
            return True, "Scanner initialized successfully."
        except Exception as e:
            return False, f"Scanner initialization failed: {str(e)}"
    
    def start_live_preview(self):
        """Start live preview in a separate thread"""
        if not self.available:
            return
        if self.is_previewing:
            return
            
        self.is_previewing = True
        self.preview_thread = threading.Thread(target=self._preview_worker)
        self.preview_thread.daemon = True
        self.preview_thread.start()
    
    def stop_live_preview(self):
        """Stop live preview"""
        self.is_previewing = False
        if self.preview_thread:
            self.preview_thread.join(timeout=1)
    
    def _preview_worker(self):
        """Worker thread for live preview"""
        buffer = (ctypes.c_ubyte * self.img_size)()
        buffer_ptr = ctypes.cast(buffer, ctypes.c_void_p)
        
        while self.is_previewing and self.device:
            try:
                if self.ftr.ftrScanIsFingerPresent(self.device, None):
                    if self.ftr.ftrScanGetImage2(self.device, 4, buffer_ptr):
                        img = np.ctypeslib.as_array(buffer).reshape((self.height, self.width))
                        
                        # Convert to base64 for web display
                        _, buffer_encoded = cv2.imencode('.png', img)
                        img_base64 = base64.b64encode(buffer_encoded).decode('utf-8')
                        
                        # Put in queue (keep only latest)
                        try:
                            self.preview_queue.get_nowait()  # Remove old frame
                        except queue.Empty:
                            pass
                        self.preview_queue.put(img_base64)
                
                time.sleep(0.1)  # 10 FPS
            except Exception as e:
                print(f"Preview error: {e}")
                break
    
    def get_latest_preview(self):
        """Get latest preview frame"""
        try:
            return self.preview_queue.get_nowait()
        except queue.Empty:
            return None
    
    def capture_current_frame(self, student_id, finger_position, finger_type):
        """Capture current frame from preview"""
        if not self.available:
            return False, "Scanner not available on this platform.", None
        if not self.device:
            return False, "Scanner not initialized.", None
            
        try:
            buffer = (ctypes.c_ubyte * self.img_size)()
            buffer_ptr = ctypes.cast(buffer, ctypes.c_void_p)
            
            # Capture current frame
            if self.ftr.ftrScanGetImage2(self.device, 4, buffer_ptr):
                img = np.ctypeslib.as_array(buffer).reshape((self.height, self.width))
                
                # Create filename
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"fingerprint_{student_id}_{finger_position}_{finger_type}_{timestamp}.png"
                
                # Ensure static/fingerprints directory exists
                os.makedirs('static/fingerprints', exist_ok=True)
                filepath = os.path.join('static/fingerprints', filename)
                
                # Save image
                cv2.imwrite(filepath, img)
                
                # Return ONLY the filename, not the full path
                return True, "Fingerprint captured successfully.", filename
            else:
                return False, "Failed to capture current frame.", None
                
        except Exception as e:
            return False, f"Capture error: {str(e)}", None
    
    def close_scanner(self):
        self.stop_live_preview()
        if self.device and self.ftr:
            self.ftr.ftrScanCloseDevice(self.device)
            self.device = None

# Global scanner instance
scanner = FingerprintScanner()
