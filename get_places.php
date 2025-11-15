<?php

header('Content-Type: application/json');

// DB Verbindung
$pdo = new PDO("mysql:host=localhost;dbname=e;charset=utf8", "root", "dbwt");

// Alle Places abrufen
$stmt = $pdo->query("SELECT * FROM places");
$places = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Als JSON ausgeben
echo json_encode($places);
