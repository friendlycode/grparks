var constants = {
	CITY_BOUNDARY_DATA_URL: "https://raw.githubusercontent.com/friendlycode/gr-parks/gh-pages/gr.geojson",
	CITY_BOUNDARY_STYLE: {color: "yellow", weight: 1, opacity: 1, clickable: false},
	CITY_CENTER: {lat: 42.9614844, lon: -85.6556833},
	PARKS_DATA_URL: "https://raw.githubusercontent.com/friendlycode/gr-parks/gh-pages/parks.geojson",
	PARKS_STYLE: {color: "#ff7800", weight: 1, opacity: 0.65, clickable: false}
	};

ids = [];
markers = [];

window.onload = function() {
	
	baseMap.init("map", constants.CITY_CENTER);
	
	var theCity = new customLayer(constants.CITY_BOUNDARY_DATA_URL, constants.CITY_BOUNDARY_STYLE);
	theCity.getData();
	
	var theParks = new customLayer(constants.PARKS_DATA_URL, constants.PARKS_STYLE);
	theParks.addMarker = makeMarker;
	theParks.getData(makeParkList);
	
	}

baseMap = {
	init: function(div, center) {
		var view = window.location.search.substring(1);
		if (view == "") {view = "github.kedo1cp3";} else {view = "mapbox." + view;}
		this.map = L.map(div, {center: center, zoom: 12});
		L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
			attribution: 
				"<a target='_blank' href='" +
					"https://www.mapbox.com/about/maps/'>&copy; Mapbox</a> " +
				"<a target='_blank' href='" +
					"http://www.openstreetmap.org/copyright'>&copy; OpenStreetMap</a> " +
				"<a target='_blank' href='" +
					"https://www.mapbox.com/map-feedback/#/-85.596/42.997/14'><b>Improve this map</b></a>",
			minZoom: 11,
			maxZoom: 17,
			id: view,
			accessToken: "pk.eyJ1IjoiZ2l0aHViIiwiYSI6IjEzMDNiZjNlZGQ5Yjg3ZjBkNGZkZWQ3MTIxN2FkODIxIn0.o0lbEdOfJYEOaibweUDlzA"
			}).addTo(this.map);
		},
	}

function customLayer(url, style) {
	this.style = style;
	this.url = url;
	this.getData = function(callback) {
		this.callback = callback;
		var xobj = new XMLHttpRequest();
		if (xobj.overrideMimeType) {xobj.overrideMimeType("application/json");}
		xobj.open('GET', this.url, true);
		var x = this;
		xobj.onreadystatechange = function () {
			if (xobj.readyState == 4 && xobj.status == "200") {x.draw(xobj.responseText);}
			};
	    xobj.send(null);  	
		}
	this.draw = function(response) {
		var data = JSON.parse(response);
		L.geoJson(data, {onEachFeature: this.addMarker, style: this.style}).addTo(baseMap.map);
		if (!(this.callback === undefined)) {this.callback();}
		}
	function addMarker() {}
	function callback() {}
	}

var newIcon = L.Icon.Default.extend({options: {}});

function makeMarker(feature, layer) {
	if (ids.indexOf(feature.id) == -1 && feature.properties && feature.properties.name) {		
		ids.push(feature.id);
		if (!feature.properties.millage) {feature.properties.millage = "none";};
		var thisMarker = L.marker(layer.getBounds().getCenter(), {icon: new newIcon({iconUrl: "images/marker-icons/" + feature.properties.type.split(" ")[0].toLowerCase() + ".png"}), riseOnHover: true}).addTo(baseMap.map);
		thisMarker.on("click", function(e) {liPark(e.target.index).scrollIntoView()});
		thisMarker.on("popupopen", function(e) {clickPark(e, true)});
		thisMarker.on("popupclose", function(e) {clickPark(e), false});
		thisMarker.park = {
			"name": feature.properties.name, 
			"type": feature.properties.type + " " + feature.properties.leisure,
			"acreage": feature.properties.acreage,
			"pool": feature.properties.pool,
			"millage": feature.properties.millage		
			};
		function header() {return "<h3>" + thisMarker.park.name + "</h3>";}
		var oldSetPopup = thisMarker.setPopupContent;
		thisMarker.setPopupContent = newSetPopup;
		function newSetPopup(long) {
			var msg = header();
			if (long) {msg += "description of improvements would go here";}
			oldSetPopup.call(thisMarker, msg);
			}
		thisMarker.bindPopup(header(), {closeButton: false, maxHeight: 300});
		markers.push(thisMarker);
		}
	}

function liPark(index) {
	return (parklist.getElementsByTagName("li")[index]);
	}

function clickPark(e, open) {
	var index = e.target.index;
	liPark(index).classList.toggle("highlight");
	if (!open) {markers[index].setPopupContent(false);}
	}
	
function makeParkList() {
	
	ids = undefined;
	markers.sort(function(a, b){return (a.park.name.toUpperCase() > b.park.name.toUpperCase()) ? 1 : -1;});
	
	for (i = 0; i < markers.length; i++) {
		
		var thisMarker = markers[i];
		var thisPark = JSON.parse(JSON.stringify(thisMarker.park));
		thisMarker.index = i;
				
		var a = document.createElement("a");
		a.href = "javascript:pop(" + i + ");";
		a.title = thisPark.name;
		
		for (feature in thisPark) {
			var p = document.createElement("p");
			switch (feature) {
				case "acreage":
					p.textContent = thisPark[feature] + " acres";
					break;
				case "millage":
					if (thisPark[feature] == "none") {
						p.innerHTML = "&nbsp;";
						} 
					else {
						p.innerHTML = 
							"<a href='#' title='Details of improvements' onclick='moneyClicked(" + i +  ");'>" + thisPark[feature] + "&nbsp;<i class='fa fa-info-circle fa-lg'></i></a>";
						;}
					break;
				case "pool":
					if (thisPark[feature] == "") {
						p.innerHTML = "&nbsp;";
						} 
					else {
						p.textContent = thisPark[feature] + " pool";
						}
					break;
				default:
					p.textContent = thisPark[feature];
				}
			a.appendChild(p);
			}
		
		var li = document.createElement("li");
		li.className = thisPark.type.split(" ")[0].toLowerCase();
		li.appendChild(a);		
		parklist.appendChild(li);
		
		}  

	}

function moneyClicked(index) {
	markers[index].setPopupContent(true);
	pop(index);
	}

function pop(index) {
	var thisMarker = markers[index];
	var where = thisMarker.getLatLng();
	var zoom = baseMap.map.getZoom();
	if (zoom < 15) {zoom = 15;}
	baseMap.map.setView(where, zoom, {animation: true});
	thisMarker.openPopup();
	}