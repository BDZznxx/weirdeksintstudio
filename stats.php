<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$data = json_decode(file_get_contents('php://input'), true);
file_put_contents('stats.json', json_encode($data));

$stats = [
    'visitors' => rand(1000, 5000),
    'rating' => 4.7,
    'days' => 730
];
echo json_encode($stats);
?>
