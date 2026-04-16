CREATE DATABASE IF NOT EXISTS parkit;
USE parkit;

CREATE TABLE IF NOT EXISTS parking_areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_slots INT NOT NULL,
    available_slots INT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO parking_areas (name, total_slots, available_slots, latitude, longitude) VALUES
('Downtown Central Parking', 150, 45, 12.971598, 77.594562),
('City Center Mall Plaza Parking', 300, 120, 12.978393, 77.593847),
('Tech Park Alpha Parking', 500, 250, 12.981882, 77.608316),
('Airport Express Parking', 800, 50, 13.198909, 77.706813),
('Green View Park Garage', 100, 15, 12.934893, 77.581561),
('Boutique Hotel Parking', 50, 5, 12.979148, 77.605282),
('Metro Station East Parking', 200, 0, 12.935105, 77.632296),
('University Campus Parking', 400, 310, 13.013589, 77.568160),
('Riverside Plaza Parking', 250, 80, 12.946356, 77.536780),
('Stadium West Deck', 600, 450, 12.969165, 77.589832),
('Hospital Visitor Parking', 150, 30, 12.964955, 77.595908),
('Market Square Lot', 120, 10, 12.985920, 77.606900),
('Northside Commuter Lot', 350, 120, 13.045610, 77.570198),
('South Park Commercial Lot', 200, 60, 12.912693, 77.598687),
('IT Corridor Tower A', 450, 100, 12.839939, 77.677003),
('Harbor View Parking', 180, 90, 12.976547, 77.534832),
('Grand Avenue Garage', 280, 140, 12.974917, 77.535812),
('Innovation Hub Parking', 320, 200, 13.028956, 77.589653),
('Sunset Strip Parking', 100, 20, 13.003584, 77.616335),
('Lakeside Leisure Parking', 150, 55, 12.891393, 77.653609);
