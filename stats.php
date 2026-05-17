<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Hitung hari aktif sejak 1 Januari 2023
$startDate  = new DateTime('2023-01-01');
$today      = new DateTime();
$diff       = $startDate->diff($today);
$activeDays = (int) $diff->days;

// Nilai default
$visitors = 1247;
$rating   = 4.7;

// Baca stats dari file JSON jika ada
$statsFile = __DIR__ . '/stats.json';

if (file_exists($statsFile)) {
    $saved = json_decode(file_get_contents($statsFile), true);
    if (is_array($saved)) {
        if (isset($saved['visitors'])) {
            $visitors = (int) $saved['visitors'];
        }
        if (isset($saved['rating'])) {
            $rating = (float) $saved['rating'];
        }
    }
}

// Jika POST: simpan data baru
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data  = json_decode($input, true);

    if (is_array($data)) {
        if (isset($data['visitors'])) {
            $visitors = (int) $data['visitors'];
        }
        if (isset($data['rating'])) {
            $rating = (float) $data['rating'];
        }

        file_put_contents($statsFile, json_encode([
            'visitors' => $visitors,
            'rating'   => $rating,
        ]));
    }
}

// Kirim response JSON
echo json_encode([
    'visitors'   => $visitors,
    'rating'     => round($rating, 1),
    'days'       => $activeDays,
    'updated_at' => date('c'),
]);
