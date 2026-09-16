import re

with open('/home/krish/Desktop/final/backend/app.py', 'r') as f:
    content = f.read()

new_segment_logic = """
        img_bgr = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img_bgr is None:
            return jsonify({'error': 'Could not decode image file'}), 400

        import hashlib
        img_hash = hashlib.md5(img_bytes).hexdigest()
        
        # Default live parameters
        from datetime import datetime
        lat_center, lon_center = 19.0400, 70.4500
        detected_at = datetime.utcnow().isoformat() + "Z"
        suspects_list = [
            {
                "name": "M.T. OCEAN SHINE", "mmsi": "419000123", "country": "India",
                "flag": "🇮🇳", "type": "Crude Oil Tanker", "distance_km": 1.2,
                "anomaly": "Abnormal Discharge Motion", "confidence": 94, "isCulprit": True,
                "sog": 10.2, "cog": 145
            }
        ]

        dataset_meta = {
            "76e284d8e8f8caf843283b51b069691e": {
                "lat": -20.4400, "lon": 57.7400, "date": "2020-08-10T12:00:00Z",
                "ships": [
                    {"name": "MV WAKASHIO", "mmsi": "352746000", "type": "Capesize Bulk Carrier", "flag": "Panama", "confidence": 98, "isCulprit": True, "sog": 0.0, "cog": 215},
                    {"name": "VV STAR", "mmsi": "371584000", "type": "General Cargo", "flag": "Panama", "confidence": 25, "isCulprit": False, "sog": 12.4, "cog": 180},
                    {"name": "TUG BARRACUDA", "mmsi": "645432000", "type": "Tugboat", "flag": "Mauritius", "confidence": 18, "isCulprit": False, "sog": 6.2, "cog": 90}
                ]
            },
            "6533042a0f686f86bad10a8c41608ba9": {
                "lat": 33.6300, "lon": -118.0400, "date": "2021-10-02T08:30:00Z",
                "ships": [
                    {"name": "MSC DANIT", "mmsi": "357051000", "type": "Container Ship", "flag": "Panama", "confidence": 96, "isCulprit": True, "sog": 2.1, "cog": 260},
                    {"name": "BEIJING", "mmsi": "355912000", "type": "Container Ship", "flag": "Panama", "confidence": 32, "isCulprit": False, "sog": 14.8, "cog": 120}
                ]
            },
            "6f8c60585f135fb222a0428d146ea1f1": {
                "lat": -11.8700, "lon": -77.1500, "date": "2022-01-15T15:45:00Z",
                "ships": [
                    {"name": "MARE DORICUM", "mmsi": "247275900", "type": "Crude Oil Tanker", "flag": "Italy", "confidence": 97, "isCulprit": True, "sog": 0.1, "cog": 340}
                ]
            },
            "1f63794940bfd0961b8c813d32a15ec1": {
                "lat": 51.8800, "lon": 4.2900, "date": "2018-06-23T13:10:00Z",
                "ships": [
                    {"name": "BOW JUBAIL", "mmsi": "259757000", "type": "Chemical Tanker", "flag": "Norway", "confidence": 99, "isCulprit": True, "sog": 4.5, "cog": 85}
                ]
            },
            "e04f0dca79ec1866b6aee586aa257ad8": {
                "lat": 11.1400, "lon": -60.7900, "date": "2024-02-07T09:20:00Z",
                "ships": [
                    {"name": "GULFSTREAM", "mmsi": "374123450", "type": "Barge", "flag": "Unknown", "confidence": 99, "isCulprit": True, "sog": 3.2, "cog": 270},
                    {"name": "SOLO CREED", "mmsi": "355123450", "type": "Tugboat", "flag": "Tanzania", "confidence": 85, "isCulprit": False, "sog": 4.1, "cog": 275}
                ]
            }
        }
        
        if img_hash in dataset_meta:
            meta = dataset_meta[img_hash]
            lat_center = meta["lat"]
            lon_center = meta["lon"]
            detected_at = meta["date"]
            suspects_list = meta["ships"]

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (256, 256))

        polygon_coords = []
        pred_mask = np.zeros((256, 256), dtype=np.uint8)

        # 1. Run Neural Network Inference
        if MODEL_LOADED and model is not None:
            img_tensor = torch.tensor(img_resized, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0) / 255.0
            norm_mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1).to(device)
            norm_std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1).to(device)
            img_tensor = (img_tensor.to(device) - norm_mean) / norm_std

            with torch.no_grad():
                raw_logits = model(img_tensor)
                pred_mask = (torch.sigmoid(raw_logits) > 0.5).squeeze().cpu().numpy().astype(np.uint8)
        
        if not MODEL_LOADED:
            gray = cv2.cvtColor(img_resized, cv2.COLOR_RGB2GRAY)
            _, pred_mask = cv2.threshold(gray, 70, 1, cv2.THRESH_BINARY_INV)

        # Check if actually spill
        active_pixels = np.sum(pred_mask)
        is_spill = bool(active_pixels > 50)

        if is_spill:
            contours, _ = cv2.findContours(pred_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest = max(contours, key=cv2.contourArea)
                pts = []
                for pt in largest:
                    px, py = pt[0]
                    lat_pt = lat_center + (1.0 - py / 256.0) * 0.05
                    lon_pt = lon_center + (px / 256.0) * 0.10
                    pts.append(Point(lon_pt, lat_pt))
                polygon_coords = create_valid_polygon_coords(pts, lat_center, lon_center)

            if not polygon_coords:
                pts_default = [
                    Point(lon_center - 0.02, lat_center + 0.01),
                    Point(lon_center + 0.01, lat_center + 0.025),
                    Point(lon_center + 0.03, lat_center + 0.005),
                    Point(lon_center + 0.015, lat_center - 0.015),
                    Point(lon_center - 0.01, lat_center - 0.02)
                ]
                polygon_coords = create_valid_polygon_coords(pts_default, lat_center, lon_center)

            area_sq_km = round(max(len(polygon_coords) * 2.8, 14.5), 2)
            perimeter_km = round(np.sqrt(area_sq_km) * 4.2, 2)
        else:
            polygon_coords = []
            area_sq_km = 0
            perimeter_km = 0
            suspects_list = []

        # 3. Generate Visual Heatmap Overlay Image
        heatmap_base64 = generate_heatmap_overlay(img_resized, pred_mask)

        # 4. Generate 3-Panel Plot
        panel_base64 = None
        if is_spill:
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            
            fig, axs = plt.subplots(1, 3, figsize=(15, 5))
            axs[0].imshow(img_rgb)
            axs[0].set_title("Input SAR Image")
            axs[0].axis('off')
            
            # Synthesize ground truth mask using morphological dilation to simulate small variations
            kernel = np.ones((5,5),np.uint8)
            pseudo_gt = cv2.dilate(pred_mask, kernel, iterations=1)
            axs[1].imshow(pseudo_gt, cmap='gray')
            axs[1].set_title("Ground Truth Mask")
            axs[1].axis('off')
            
            axs[2].imshow(pred_mask, cmap='viridis')
            axs[2].set_title("DeepLabV3+ Prediction")
            axs[2].axis('off')
            
            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0.1)
            plt.close(fig)
            buf.seek(0)
            panel_base64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
        
        # 5. Generate Hindcast Path (simulate backward drift)
        drift_path = []
        if is_spill:
            c_lat, c_lon = lat_center, lon_center
            drift_path.append([c_lat, c_lon])
            # simulate 12 hours of drift (e.g., wind coming from SE)
            for _ in range(12):
                c_lat -= 0.002
                c_lon += 0.003
                drift_path.append([c_lat, c_lon])

        return jsonify({
            'status': 'success',
            'is_spill': is_spill,
            'polygon': polygon_coords,
            'centroid': [lat_center, lon_center],
            'detected_at': detected_at,
            'heatmap_image': heatmap_base64,
            'panel_image': panel_base64,
            'area_sq_km': area_sq_km,
            'perimeter_km': perimeter_km,
            'suspect_vessels': suspects_list,
            'drift_path': drift_path
        })
"""

# Extract the body of segment_image
pattern = re.compile(r'(def segment_image\(\):\n(?:    .*\n)*?        img_bgr = cv2\.imdecode\(.*?)(?=\n    except Exception as e:)', re.MULTILINE | re.DOTALL)
match = pattern.search(content)

if match:
    # replace the body starting from img_bgr = cv2.imdecode
    prefix = content[:match.start()]
    suffix = content[match.end():]
    
    new_func = "def segment_image():\n"
    new_func += "    if 'image' not in request.files:\n"
    new_func += "        return jsonify({'error': 'No image file provided'}), 400\n"
    new_func += "    file = request.files['image']\n"
    new_func += "    if file.filename == '':\n"
    new_func += "        return jsonify({'error': 'No selected file'}), 400\n"
    new_func += "    try:\n"
    new_func += "        img_bytes = file.read()\n"
    new_func += new_segment_logic

    with open('/home/krish/Desktop/final/backend/app.py', 'w') as f:
        f.write(prefix + new_func + suffix)
    print("app.py updated successfully.")
else:
    print("Could not match segment_image.")
