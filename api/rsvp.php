<?php
/**
 * Yomali & Harindu Wedding — RSVP API (PHP backend)
 * Stores RSVP submissions in rsvps.json
 */
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$file = __DIR__ . '/rsvps.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo file_exists($file) ? file_get_contents($file) : '[]';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['name'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Name is required"]);
        exit;
    }

    $existing = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    $entry = [
        "id"         => uniqid(),
        "name"       => htmlspecialchars($data['name']),
        "attendance" => htmlspecialchars($data['attendance'] ?? 'attending'),
        "guests"     => intval($data['guests'] ?? 1),
        "dietary"    => htmlspecialchars($data['dietary'] ?? 'Standard'),
        "message"    => htmlspecialchars($data['message'] ?? ''),
        "timestamp"  => date("Y-m-d H:i:s")
    ];
    $existing[] = $entry;
    file_put_contents($file, json_encode($existing, JSON_PRETTY_PRINT));
    echo json_encode(["status" => "success", "entry" => $entry]);
    exit;
}
