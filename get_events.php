<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$pdo = new PDO("mysql:host=localhost;dbname=e;charset=utf8", "root", "dbwt");

// Events mit Kategorien und Farben holen
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
    ORDER BY start_date ASC
");

$events = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($events);
?>