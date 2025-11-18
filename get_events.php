<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Cloud Database Verbindung
$host = 'serverless-northeurope.sysp0000.db3.skysql.com';
$dbname = 'eventmap';
$username = 'dbpbf05544796';
$password = 'EventMap2024!Secure';
$port = 4025;

try {
    // DIESE ZEILE GEÄNDERT - SSL Optionen hinzugefügt
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8", $username, $password, [
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
        PDO::MYSQL_ATTR_SSL_KEY => false,
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

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
        $imagePath = 'images/events/' . $event['id'] . '.jpg';
        if (file_exists($imagePath)) {
            $event['image_url'] = $imagePath;
        } else {
            $event['image_url'] = null;
        }
    }

    echo json_encode($events);

} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>