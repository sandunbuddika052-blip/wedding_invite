<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/rsvps.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        echo file_get_contents($dataFile);
    } else {
        echo json_encode([]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || empty($data['name'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Name is required"]);
        exit;
    }

    $existing = [];
    if (file_exists($dataFile)) {
        $existing = json_decode(file_get_contents($dataFile), true) ?: [];
    }

    $newEntry = [
        "id" => uniqid(),
        "name" => htmlspecialchars($data['name']),
        "attendance" => htmlspecialchars($data['attendance'] ?? 'attending'),
        "guests" => intval($data['guests'] ?? 1),
        "dietary" => htmlspecialchars($data['dietary'] ?? 'Standard'),
        "message" => htmlspecialchars($data['message'] ?? ''),
        "timestamp" => date("Y-m-d H:i:s")
    ];

    $existing[] = $newEntry;

    file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT));

    echo json_encode(["status" => "success", "data" => $newEntry]);
    exit;
}
