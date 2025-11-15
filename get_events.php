<?php

header('Content-Type: application/json');

$pdo = new PDO("mysql:host=localhost;dbname=e;charset=utf8", "root", "dbwt");

// Events holen, die heute oder zukünftig stattfinden
$stmt = $pdo->query("
    SELECT events.*, places.latitude, places.longitude, places.name AS place_name
    FROM events
    JOIN places ON events.place_id = places.id
    WHERE events.end_date >= CURDATE()
    ORDER BY start_date ASC
");

$events = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($events);
