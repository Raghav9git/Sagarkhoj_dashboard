import cv2
import numpy as np

# Create a dummy mask
pred_mask = np.zeros((256, 256), dtype=np.uint8)
cv2.ellipse(pred_mask, (128, 128), (50, 20), 45, 0, 360, 1, -1)

lat_center, lon_center = 19.04, 70.45

contours, _ = cv2.findContours(pred_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
if contours:
    largest = max(contours, key=cv2.contourArea)
    epsilon = 0.01 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)
    
    M = cv2.moments(largest)
    if M['m00'] != 0:
        cx = int(M['m10']/M['m00'])
        cy = int(M['m01']/M['m00'])
    else:
        cx, cy = 128, 128
        
    pts = []
    for pt in approx:
        px, py = pt[0]
        d_lon = (px - cx) * 0.0005
        d_lat = (cy - py) * 0.0005
        # Leaflet Polygon expects [lat, lon]
        pts.append([round(lat_center + d_lat, 5), round(lon_center + d_lon, 5)])
        
    print(f"Points ({len(pts)}):", pts)
