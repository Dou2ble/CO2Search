

function degToRad(deg) {
  return deg * (Math.PI / 180);
}

function getDistance(leg) {
  const earthRadius = 6371; // Radius of the Earth in kilometers

  // Convert latitude and longitude values from degrees to radians
  let lat1Deg = leg["Origin"]["lat"];
  let lon1Deg = leg["Origin"]["lon"];
  let lat2Deg = leg["Destination"]["lat"];
  let lon2Deg = leg["Destination"]["lon"];

  let dLat = degToRad(lat2Deg-lat1Deg);
  let dLon = degToRad(lon2Deg-lon1Deg);
  let lat1 = degToRad(lat1Deg);
  let lat2 = degToRad(lat2Deg);

  let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  let d = earthRadius * c;
  return d;
}





let origin = document.getElementById("origin")
let originList = document.getElementById("origin-list")
let destination = document.getElementById("destination")
let destinationList = document.getElementById("destination-list")
let routeList = document.getElementById("route-list")
  
let search = document.getElementById("search")
  
let osmMap = document.getElementById("osm-map")
let map = L.map(osmMap)
  
let defaultZoom = 16
  
function clearMap(map) {
  map.eachLayer(function (layer) {
    if (layer instanceof L.Marker || layer instanceof L.Polyline) {
      map.removeLayer(layer);
    }
  });
}

function calculateCO2(distance, operator, veichle) {
  // SOURCE: https://klimatsmartsemester.se/transportmedelsberakningar/
  let multiplyer = 0
  if (
    veichle === "Tunnelbana" ||
    veichle === "Spårväg" ||
    veichle.toLowerCase().includes("tåg")
  ) {
    multiplyer = 7
  } else if (veichle.toLowerCase().includes("flyg")) {
    multiplyer = 133
  } else if (veichle.toLowerCase().includes("färja")) {
    multiplyer = 226
  } else if (veichle.toLowerCase().includes("buss")) {
    if (operator === "SL") { 
      multiplyer = 7
    } else {
      multiplyer = 25
    }
  }

  return distance*multiplyer
}

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

let target = L.latLng(59.406626, 17.945252) 
map.setView(target, defaultZoom)


origin.oninput = function() {
  let url = `/api/query-stops?query=${encodeURIComponent(origin.value)}` 

  originList.innerHTML = ""
  fetch(url)
    .then(response => response.json())
    .then(data => {
      data.forEach(item => {
        let text = document.createTextNode(item)
        let li = document.createElement("li")
        li.classList.add("cursor-pointer")
        li.appendChild(text)
        li.onclick = function() {
          origin.value = li.innerText
          origin.classList.add("border-green-400")
        }
        originList.appendChild(li)
      });
    }) 
  
  origin.classList.remove("border-neutral-400")
}

origin.addEventListener("focus", function () {
  originList.classList.remove("hidden")
})

origin.addEventListener("blur", function () {
  origin.value = originList.querySelector("li:first-child").textContent
})

destination.oninput = function() {
  let url = `/api/query-stops?query=${encodeURIComponent(destination.value)}` 

  destinationList.innerHTML = ""
  fetch(url)
    .then(response => response.json())
    .then(data => {
      data.forEach(item => {
        let text = document.createTextNode(item)
        let li = document.createElement("li")
        li.classList.add("cursor-pointer")
        li.appendChild(text)
        li.onclick = function() {
          destination.value = li.innerText
          destination.classList.add("border-green-400")
        }
        destinationList.appendChild(li)
      });
    }) 

  destination.classList.remove("border-neutral-400")
}

destination.addEventListener("focus", function () {
  destinationList.classList.remove("hidden")
})

destination.addEventListener("blur", function () {
  destination.value = destinationList.querySelector("li:first-child").textContent
})




search.onclick = () => {
  originList.classList.add("hidden")
  destinationList.classList.add("hidden")

  clearMap(map)
  let originTarget = null
  let destinationTarget = null
  
  let url = `/api/get-stop?stop=${encodeURIComponent(origin.value)}`
  let fetchOrigin = fetch(url)
    .then(response => response.json())
    .then(data => {
      originTarget = L.latLng(data["lat"], data["lon"])
      map.setView(originTarget, defaultZoom)
      L.marker(originTarget).addTo(map)
    })

  url = `/api/get-stop?stop=${encodeURIComponent(destination.value)}`
  let fetchDestination = fetch(url)
    .then(response => response.json())
    .then(data => {
      destinationTarget = L.latLng(data["lat"], data["lon"])
      L.marker(destinationTarget).addTo(map)
    })

  Promise.all([fetchOrigin, fetchDestination])
    .then(() => {
      const polyline = L.polyline([originTarget, destinationTarget], { color: 'blue' }).addTo(map);
    })

  url = `/api/query-routes?origin=${encodeURIComponent(origin.value)}&destination=${encodeURIComponent(destination.value)}`
  routeList.innerHTML = ""
  fetch(url)
    .then(response => response.json())
    .then(data => {
      data.forEach((item) => {
        let routeLi = document.createElement("li")

        routeLi.classList.add("my-10")
        routeLi.classList.add("bg-neutral-200")
        routeLi.classList.add("rounded-3xl")
        routeLi.classList.add("p-5")
        routeLi.classList.add("hover:bg-neutral-100")
        routeLi.classList.add("cursor-pointer")

        routeCO2 = 0

        item["LegList"]["Leg"].forEach((leg) => {
          let div = document.createElement("div")
          div.classList.add("grid")
          div.classList.add("grid-cols-2")

          let product = document.createTextNode(`${getDistance(leg).toFixed(3)}km - ${leg["Product"][0]["operator"]} - ${leg["Product"][0]["name"]}`.replace("undefined - Promenad", "󰖃  Promenad").replace("undefined - Byten", "󰚮 Byte"))
          let route = document.createTextNode(`${leg["Origin"]["name"]}   ${leg["Destination"]["name"]}`)
          let productP = document.createElement("p")
          let routeP = document.createElement("p")
          productP.appendChild(product)
          routeP.appendChild(route)

          div.appendChild(productP)
          div.appendChild(routeP)

          routeLi.appendChild(div)

          routeCO2 += calculateCO2(getDistance(leg), leg["Product"][0]["operator"], leg["Product"][0]["name"])
        })

        let CO2 = document.createTextNode(`${(routeCO2/1000).toFixed(3)} kg CO2`)
        let CO2p = document.createElement("p")
        CO2p.classList.add("text-green-500")
        CO2p.classList.add("text-lg")
        CO2p.classList.add("font-semibold")

        CO2p.appendChild(CO2)
        routeLi.insertBefore(CO2p, routeLi.firstChild)

        routeList.appendChild(routeLi)
      })
    })
}