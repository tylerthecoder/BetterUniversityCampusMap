<?php
$q = $_GET['q'];
if ($q == "userEvent") {
	$data = json_decode(file_get_contents("events.json"),true);
	array_push($data["Events"], $_POST['d']);
	print_r($data);
	file_put_contents("events.json",json_encode($data));
	echo file_get_contents("events.json");
}else if ($q == "newUser") {
	$data = json_decode(file_get_contents("people.json"),json);
	$loc = array("lat"=>36.066307, "lng"=>-94.173854);
	array_push($data, $loc);
	file_put_contents("people.json", json_encode($data));
}

$q = $_GET['q'];
if ($q == "getUsers") {
	//query the users database;
}else if ($q == "addUser") {
	//get IP adress to make sure that it is a different user;
}





?>