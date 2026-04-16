UPDATE parking_areas SET 
  latitude = 13.05 + (RAND() - 0.5) * 0.15, 
  longitude = 80.18 + (RAND() - 0.5) * 0.12;
