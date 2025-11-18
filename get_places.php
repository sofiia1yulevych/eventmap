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
    // SSL DEAKTIVIEREN - diese Optionen hinzufügen
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8", $username, $password, [
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
        PDO::MYSQL_ATTR_SSL_KEY => false,
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Alle Places abrufen
    $stmt = $pdo->query("SELECT * FROM places");
    $places = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($places);

} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>