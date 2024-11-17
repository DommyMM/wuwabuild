from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from ocr import process_image

app = Flask(__name__)
CORS(app)

@app.route('/api/ocr', methods=['POST'])
def process_image_request():
    try:
        if not request.json or 'image' not in request.json:
            return jsonify({
                "success": False,
                "error": "No image data provided"
            }), 400

        image_data = request.json['image']
        if ',' not in image_data:
            return jsonify({
                "success": False,
                "error": "Invalid image format"
            }), 400
            
        image_data = image_data.split(',')[1]
        
        try:
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Image processing error: {str(e)}"
            }), 400

        result = process_image(image)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False, 
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)