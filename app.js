let map;
let markers = [];
let eventMarkers = [];
let infoWindow = null;
let geocoder = new google.maps.Geocoder();
let events = [];
let mapStyle = [
  {featureType: "administrative",elementType: "labels",stylers: [{ visibility: "off" }]},
  {featureType: "poi",elementType: "labels",stylers: [{ visibility: "off" }]},
  {featureType: "water",elementType: "labels",stylers: [{ visibility: "off" }]},
  {featureType: "road",elementType: "labels",stylers: [{ visibility: "off" }]}
]
function initMap() {
  $.post("actions.php?q=newUser")

  map = new google.maps.Map(document.getElementById('mapDiv'), {
    zoom: 17, 
    center: {lat: 36.067836, lng: -94.173662},
    mapTypeId: 'roadmap',
    mapTypeControl: false
  });
  map.addListener('zoom_changed', function() {
    if (map.zoom < 14) {
      map.zoom = 14;
    }else if (map.zoom < 17) {
      for (let i of markers) {
        i.setMap(null) 
      }
    }else{
      for (let i of markers) {
        i.setMap(map) 
      }
    }
  });
  
  makeHeatMap()
  addBuildingMarkers()
  
  map.set('styles', mapStyle);
}

function openInfoWindow (text,marker) {
	if (infoWindow != null) infoWindow.close()
	infoWindow = new google.maps.InfoWindow({
		content:text
	});
	infoWindow.open(map, marker);
}



let heatmap;
let oldData = [];
function makeHeatMap () {
  setInterval(function () {
    let flag = false;
    let jeremy = $.getJSON("people.json")
    .done(function (data) {
      let points = [];
      for (let i in data) {
        points.push(new google.maps.LatLng(+data[i].lat,+data[i].lng));
        if (!oldData[i]) {
          oldData[i] = {}
          flag = true;
        }
        if (oldData[i].lat != data[i].lat) flag = true;
        if (oldData[i].lng != data[i].lng) flag = true;

        oldData[i].lat = data[i].lat
        oldData[i].lng = data[i].lng
      }
      if (flag) {
        if (heatmap) heatmap.setMap(null);
        heatmap = new google.maps.visualization.HeatmapLayer({
          data: points,
          map: map,
          radius:40
        });
      }
    })
  },1000)
}

let places = []
function addBuildingMarkers () {
  var tyler = $.getJSON("buildings.json")
  .done(function( json ) {
    for (let i of json){
      places = json;
      var myLatlng = new google.maps.LatLng(+i.latitude,+i.longitude);
      let overlay = new CustomMarker(
        myLatlng, 
        map,
        {data: i}
      );
      markers.push(overlay)
      i.marker = overlay
      let shapeCords = i.shape;
      if (!shapeCords) continue;
      let cords = [];
      for (let j of i.shape.split(',')) {
        let c = j.split(" ");
        cords.push({lat: +c[0], lng: +c[1]})
      }
      var shape = new google.maps.Polygon({
        path: cords,
        fillColor: '#FF0000',
      });
      shape.setMap(map);
    }
    userEvents()
    getCalendarEvents();
  })
}

let lastLength = 0;
function userEvents () {
  setInterval (function () {
    let tracy = $.getJSON("events.json")
    .done(function( json ) {
      json = json["Events"]
      if (json.length == lastLength) return 0;
      dataToAdd = json.slice(-(json.length - lastLength)) // get only the new events
      lastLength = json.length 

      console.log("User Events", json)
      for (let i of dataToAdd) {
        i.type = "user"
        events.push(i)
        let myLatLng = false;
        for (let j of places) {
          if (i.location == j.code) {
            myLatLng = new google.maps.LatLng(+j.latitude,+j.longitude)
            break;
          }
        }
        var marker = new google.maps.Marker({
          position: myLatLng,
          map: map,
          data:i
        });
        i.marker = marker
        marker.addListener('click', function() {
        	openInfoWindow("<h1>" + this.data.name + "</h1><p>" + this.data.Description + "</p>", this);
        });
        eventMarkers.push(marker)
      }
    })
  },1000)
}

function getCalendarEvents () {
  let grady = $.getJSON("calendarEvents.json")
  .done(function( json ) {
    console.log("Cal Events", json)
    for (let i of json) {
      i.type = "cal"
      events.push(i);
      if (!i.loc) continue;
      geocoder.geocode({'address': i.loc}, function(results, status) {
        if (status === 'OK') {
          var marker = new google.maps.Marker({
            position: results[0].geometry.location,
            map: map,
            icon:'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
            data:i
          });
          i.marker = marker
          marker.addListener('click', function() {
          	openInfoWindow("<h1>" + this.data.name + "</h1><p>" + this.data.desc + "</p>",this)
          });
          eventMarkers.push(marker)
        }else{
          console.log('Geocode was not successful for the following reason: ' + status);
        }
      });
    };
  })
}

function search () {
  document.getElementById("res").innerHTML = ""
  if (document.getElementById("query").value.length == 0) {
   return "";
  }

  var query = document.getElementById("query").value

  let counter = 0;

  for (let i in events) {
    let data, text = false;
    if (events[i].type == "cal") {
      if (events[i].name.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1 && events[i].loc) {
        data = '{type:"eve",id:' + i + '}';
        text = events[i].name  + " (Calender Event)";
        counter++;
      }
    }else if (events[i].type == "user") {
      if (events[i].name.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1) {
        data = '{type:"userEve",id:' + i + '}';
        text = events[i].name + " (User Event)";
        counter++;
      }
    }
    if (!data || !text) continue;
    if (counter >= 2) break;
    document.getElementById("res").innerHTML += "<span class='result' onclick='moveTo(" + data + ")'>" + text + "</span><hr/>"
  }

  for (let i in places) {
    let data, text = false;
    if (places[i].name.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1) {
      data = '{type:"loc",id:' + i + '}';
      text = places[i].name;
      counter++;
    }else if (places[i].code.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1){
      data = '{type:"loc",id:' + i + '}';
      text = places[i].name;
      counter++;
    }
    if (!data || !text) continue
    if (counter >= 10) break
    document.getElementById("res").innerHTML += "<span class='result' onclick='moveTo(" + data + ")'>" + text + "</span><hr/>"
    
  }
}

function moveTo (data) {
  query.value = "";
  map.setZoom(18)
  search()
  if (data.type == "loc"){
    myLatLng = new google.maps.LatLng(+places[data.id].latitude,+places[data.id].longitude)
    map.setCenter(myLatLng)
    openInfoWindow(places[data.id].name,places[data.id].marker)
  }else if (data.type == "eve") {
    console.log(data)
    geocoder.geocode({'address': events[data.id].loc}, function(results, status) {
      if (status === 'OK') {
        map.setCenter(results[0].geometry.location);
        openInfoWindow("<h1>" + events[data.id].name + "</h1><p>" + events[data.id].desc + "</p>", events[data.id].marker)
      }else{
        console.log('Geocode was not successful for the following reason: ' + status);
      }
    });
  }else if (data.type == "userEve") {
    for (let j of places) {
      if (events[data.id].location == j.code) {
        myLatLng = new google.maps.LatLng(+j.latitude,+j.longitude)
        map.setCenter(myLatLng)
        openInfoWindow("<h1>" + events[data.id].name + "</h1><p>" + events[data.id].Description + "</p>", events[data.id].marker)
        break;
      }
    }
  }
}

function toggleHeatmap() {
  heatmap.setMap(heatmap.getMap() ? null : map);
}

google.maps.event.addDomListener(window, 'load', initMap);

function sendEvent() {
  var res = $('form').serializeArray();
  console.log(res)
  let data = {};
  for (let i in res) {
    data[res[i].name] = res[i].value
  }
  $.post("actions.php?q=userEvent",{d:data})
  .done(function (data) {
  	
  });

  $('#enterEventForm').toggle()
}
