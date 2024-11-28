from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import cv2
import numpy as np
import base64
from ocr import process_image
from concurrent.futures import ProcessPoolExecutor, TimeoutError
import multiprocessing
import atexit

MAX_WORKERS = max(2, multiprocessing.cpu_count() - 1)
PROCESS_TIMEOUT = 30
RATE_LIMIT = "20 per minute"

app = Flask(__name__)
CORS(app)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[RATE_LIMIT],
    storage_uri="memory://"
)

executor = ProcessPoolExecutor(max_workers=MAX_WORKERS)

@app.errorhandler(429)
def ratelimit_error(e):
    return jsonify({
        "success": False,
        "error": "Rate limit exceeded. Please try again later.",
        "retry_after": e.description
    }), 429

@app.route('/api/ocr', methods=['POST'])
@limiter.limit(RATE_LIMIT)
def process_image_request():
    try:
        if not request.json or 'image' not in request.json:
            return jsonify({
                "success": False,
                "error": "No image data provided"
            }), 400

        image_data = request.json['image'].split(',')[1]
        
        try:
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")

            future = executor.submit(process_image, image)
            result = future.result(timeout=PROCESS_TIMEOUT)
            
            return jsonify(result)

        except TimeoutError:
            return jsonify({
                "success": False,
                "error": "Processing timeout exceeded"
            }), 408
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Image processing error: {str(e)}"
            }), 400

    except Exception as e:
        return jsonify({
            "success": False, 
            "error": str(e)
        }), 500

@atexit.register
def shutdown():
    executor.shutdown(wait=True)

if __name__ == '__main__':
    app.run(debug=False, port=5000)