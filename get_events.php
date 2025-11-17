<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$pdo = new PDO("mysql:host=localhost;dbname=e;charset=utf8", "root", "dbwt");

// Events mit Kategorien, Farben, Zeiten und Bildern holen
$stmt = $pdo->query("
    SELECT 
        events.*, 
        places.latitude, 
        places.longitude, 
        places.name AS place_name,
        categories.name AS category_name,
        categories.color AS category_color
    FROM events
    JOIN places ON events.place_id = places.id
    LEFT JOIN categories ON events.category_id = categories.id
    WHERE events.end_date >= CURDATE()
    ORDER BY start_date ASC, start_time ASC
");

$events = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Bild-Pfade für Events hinzufügen
foreach ($events as &$event) {
    // Prüfen ob Bild existiert und Pfad setzen
    $imagePath = 'images/events/' . $event['id'] . '.jpg';
    if (file_exists($imagePath)) {
        $event['image_url'] = $imagePath;
    } else {
        $event['image_url'] = null;
    }
}

echo json_encode($events);
?>