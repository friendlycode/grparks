var settings = {
	choropleth: {
		color: function(amount) {
		    return amount >= 1000000 ? '#7a0177' :
		           amount >=  750000 ? '#c51b8a' :
		           amount >=  500000 ? '#f768a1' :
		           amount >=  250000 ? '#fbb4b9' :
		           amount >=       1 ? '#feebe2' :
		           					   'transparent';
			},
		money: [1, 250000, 500000, 750000, 1000000]
		},
	city: {
		center: {lat: 42.9614844, lon: -85.6556833},
		style: {color: "gray", weight: 3, fill: false, clickable: false},
		url: "https://raw.githubusercontent.com/friendlycode/gr-parks/gh-pages/gr.geojson"
		},
	icons: "images/marker-icons/",
	maps: {"Default": "mapbox.emerald", "Grayscale": "mapbox.light"},
	neighborhoods: {
		highlight: {weight: 5, fill: true, fillOpacity: 0.65, clickable: true},
		style: {weight: 1, fill: true, fillOpacity: 0.65, clickable: true},
		url: "https://raw.githubusercontent.com/friendlycode/gr-parks/gh-pages/neighborhoods.geojson"
		},
	parks: {
		style: {color: "#ff7800", weight: 1, opacity: 0.65, clickable: false},
		types: ["Community", "Mini", "Neighborhood", "Urban"],
		url: "https://raw.githubusercontent.com/friendlycode/gr-parks/gh-pages/parks.geojson"
		}
	}

var ids = [], markers = [], neighborhoods = [], baseLayers = {}, overlayLayers = {}, markerClicked = false;

var mapInfo = L.control({position: 'bottomleft'});
mapInfo.onAdd = function(map) {
	var div = L.DomUtil.create("div", "info");
	this.hood = L.DomUtil.create('div');
	this.update();
	var legend = L.DomUtil.create('div'),
		labels = [],
		from, to;
	for (var i = 0; i < settings.choropleth.money.length; i++) {
		from = settings.choropleth.money[i];
		to = settings.choropleth.money[i + 1] - 1;
		labels.push(
			'<i style="background:' + settings.choropleth.color(from) + '"></i> $' +
			from.toLocaleString("en-US") + (to ? '&ndash;' + to.toLocaleString("en-US") : '+'));
		}
	legend.innerHTML = labels.join('<br>');
	div.appendChild(this.hood);
	div.appendChild(legend);
	return div;
	};
mapInfo.update = function(props) {
	this.hood.innerHTML = '<h4>Neighborhood Investment</h4>' +  (props ?
		'<b>' + props.NEBRH + '</b>: $' + props.money.toLocaleString("en-US") : 'Hover over a neighbhood');
	};

// overlay layers are for the park markers and the neighborhoods
// here we set up park markers layers first, neighborhoods gets added later because it is not shown by default
for (i = 0; i < settings.parks.types.length; i++) {
	overlayLayers[labelMarker(settings.parks.types[i])] = new L.layerGroup();
	}

var theCity = new geojsonLayer(settings.city.url, settings.city.style);
theCity.getData();

var theNeighborhoods = new geojsonLayer(settings.neighborhoods.url, settings.neighborhoods.style);
theNeighborhoods.onEachFeature = function(feature, layer) {
	layer.on({
		click: setNeighborhood,
		mouseover: setNeighborhood,
		mouseout: resetNeighborhood
		});
	feature.properties.money = 0;
	neighborhoods.push(layer);
	}
theNeighborhoods.getData();

var theParks = new geojsonLayer(settings.parks.url, settings.parks.style);
theParks.onEachFeature = addMarker;
theParks.getData();


function isEverythingReady() {
	if (baseMap.ready && theCity.ready && theNeighborhoods.ready && theParks.ready) {
		ids = undefined;
		makeParkList();
		theCity.layer.addTo(baseMap.map);
		theParks.layer.addTo(baseMap.map);
		for (key in overlayLayers) {overlayLayers[key].addTo(baseMap.map);}
		overlayLayers["Neighborhoods"] = theNeighborhoods.layer;
		L.control.layers(baseLayers, overlayLayers, {position: "topright", collapsed: false}).addTo(baseMap.map);
		for (i = 0; i < neighborhoods.length; i++) {
			neighborhoods[i].setStyle({
				fill: true, 
				fillColor: settings.choropleth.color(neighborhoods[i].feature.properties.money)
				});
			}
		}
	}


window.onload = function() {
	baseMap.init("map", settings.city.center);
	isEverythingReady();
	}


baseMap = {
	ready: false,
	init: function(div, center) {
		var a = 
			"<a target='_blank' href='" +
				"https://www.mapbox.com/about/maps/'>&copy; Mapbox</a> " +
			"<a target='_blank' href='" +
				"http://www.openstreetmap.org/copyright'>&copy; OpenStreetMap</a> " +
			"<a target='_blank' href='" +
				"https://www.mapbox.com/map-feedback/#/-85.596/42.997/14'><b>Improve this map</b></a>",
			u = "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZ2l0aHViIiwiYSI6IjEzMDNiZjNlZGQ5Yjg3ZjBkNGZkZWQ3MTIxN2FkODIxIn0.o0lbEdOfJYEOaibweUDlzA"
		for (key in settings.maps) {
			var layer = L.tileLayer(u, {id: settings.maps[key], attribution: a, minZoom: 11, maxZoom: 17});
			baseLayers[key] = layer;
			}
		this.map = L.map(div, {center: center, zoom: 12, layers: baseLayers["Default"]});					
		this.map.on({
			overlayadd: function(e) {overlayChanged(e, true);},
			overlayremove: function(e) {overlayChanged(e, false);}
			})
		this.ready = true;
		}
	}


function geojsonLayer(url, style) {
	this.layer;
	this.ready = false;
	this.style = style;
	this.url = url;
	function onEachFeature() {}
	this.getData = function() {
		var xobj = new XMLHttpRequest();
		if (xobj.overrideMimeType) {xobj.overrideMimeType("application/json");}
		xobj.open('GET', this.url, true);
		var x = this;
		xobj.onreadystatechange = function () {
			if (xobj.readyState == 4 && xobj.status == "200") {
				x.layer = new L.layerGroup();
				L.geoJson(JSON.parse(xobj.responseText), {
					onEachFeature: x.onEachFeature, 
					style: x.style
					}).addTo(x.layer);
				x.ready = true;
				isEverythingReady();
				}
			};
	    xobj.send(null);  	
		}
	return this;
	}


function addMarker(feature, layer) {
	var newIcon = L.Icon.Default.extend({options: {}});
	if (ids.indexOf(feature.id) == -1 && feature.properties && feature.properties.name) {		
		ids.push(feature.id);
		var thisMarker = L.marker(layer.getBounds().getCenter(), {
			icon: new newIcon({iconUrl: srcFromMarkerType(feature.properties.type)}), 
			riseOnHover: true
			}).addTo(overlayLayers[labelMarker(feature.properties.type.split(" ")[0])]);
		thisMarker.money = Number(
			feature.properties.millage.replace(".00", "").replace("$", "").replace(",", "")
			);
		thisMarker.on({
			click: function(e) {markerClicked = true;},
			mouseover: function(e) {e.target.openPopup();},
			popupopen: function(e) {clickPark(e, true);},
			popupclose: function(e) {clickPark(e, false);}
			});
		thisMarker.park = {
			"name": feature.properties.name, 
			"acreage": feature.properties.acreage,
			"pool": feature.properties.pool,
			"millage": feature.properties.millage		
			};
//		function header() {
//			return (
//				"<h3>" + thisMarker.park.name + "</h3>" +
//				"<p>" + thisMarker.type + "</p>"
//				);
//			}
//		thisMarker.setLongPopupContent = function(long) {
//			var msg = header();
//			if (long) {msg += "description of improvements would go here";}
//			thisMarker.setPopupContent(msg);
//			}
		thisMarker.type = feature.properties.type + " " + feature.properties.leisure;
		thisMarker.bindPopup(
			"<h3>" + thisMarker.park.name + "</h3>" + 
			"<p>" + thisMarker.type + "</p>" + 
			"description of improvements would go here",
			{closeButton: false, maxHeight: 300}
			);
		markers.push(thisMarker);
		}
	}


function makeParkList() {
	
	markers.sort(function(a, b){return (a.park.name.toUpperCase() > b.park.name.toUpperCase()) ? 1 : -1;});
	
	for (i = 0; i < markers.length; i++) {
		
		var thisMarker = markers[i],
			thisPark = JSON.parse(JSON.stringify(thisMarker.park)),
			a = document.createElement("a"),
			li = document.createElement("li");
			
		thisMarker.index = i;				
		a.href = "javascript:pop(" + i + ");";
		a.title = thisPark.name;
		a.appendChild(imgFromMarkerType(thisMarker.type));		

		for (feature in thisPark) {
			var p = document.createElement("p");
			switch (feature) {
				case "acreage":
					p.textContent = thisPark[feature] + " acres";
					break;
				case "millage":
					if (!thisPark[feature]) {
						p.innerHTML = "&nbsp;";
						} 
					else {
						p.innerHTML = 
//							"<a href='#' title='Details of improvements' onclick='moneyClicked(" + i +  ");'>" + 
							thisPark[feature].replace(".00", "") + "&nbsp;<i class='fa fa-info-circle fa-lg'></i>";//</a>";
						}
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
		
		li.appendChild(a);		
		parklist.appendChild(li);
		
		for (i2 = 0; i2 < neighborhoods.length; i2++) {
		    var polyPoints = neighborhoods[i2].getLatLngs();       
		    var x = thisMarker.getLatLng().lat, y = thisMarker.getLatLng().lng;
		    var inside = false;
		    for (var i3 = 0, j3 = polyPoints.length - 1; i3 < polyPoints.length; j3 = i3++) {
		        var xi = polyPoints[i3].lat, yi = polyPoints[i3].lng;
		        var xj = polyPoints[j3].lat, yj = polyPoints[j3].lng;
		        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		        if (intersect) inside = !inside;
		    	}
		    if (inside) {neighborhoods[i2].feature.properties.money += thisMarker.money;}
			}
		
		}  

	}


function clickPark(e, open) {
	var index = e.target.index;
	liPark(index).classList.toggle("highlight");
	if (open) {
		if (markerClicked) {
			liPark(index).scrollIntoView();
			markerClicked = false
			}	
		}
//	else {
//		markers[index].setLongPopupContent(true);
//		}
	}
	
function imgFromMarkerType(type) {
	var img = document.createElement("img");
	img.src = srcFromMarkerType(type);
	return img;
	}

function labelMarker(type) {
	return "<img src='" + srcFromMarkerType(type) + "' class='small'>" + type;
	}

function liPark(index) {
	return (parklist.getElementsByTagName("li")[index]);
	}

//function moneyClicked(index) {
//	markers[index].setLongPopupContent(true);
//	pop(index);
//	}

function overlayChanged(e, show) {
	if (e.name == "Neighborhoods") {
		if (show) {
			mapInfo.addTo(baseMap.map);
			} 
		else {
			mapInfo.removeFrom(baseMap.map);
			resetNeighborhood();
			}
		}
	else {
		overlayLayers[e.name].eachLayer(function(layer) {
			liPark(layer.index).style.display = show ? "block" : "none";
			});
		}
	}

function pop(index) {
	var thisMarker = markers[index],
		where = thisMarker.getLatLng(),
		zoom = baseMap.map.getZoom();
	if (zoom < 15) {zoom = 15;}
	baseMap.map.setView(where, zoom, {animation: true});
	thisMarker.openPopup();
	}

function resetNeighborhood() {
	theNeighborhoods.layer.getLayers()[0].setStyle(settings.neighborhoods.style);
	mapInfo.update();
	}

function setNeighborhood(e) {
	resetNeighborhood();
	e.target.setStyle(settings.neighborhoods.highlight);
	mapInfo.update(e.target.feature.properties);
	}

function srcFromMarkerType(type) {
	return settings.icons + type.split(" ")[0].toLowerCase() + ".png";
	}