import std/[strformat, uri, httpclient, json, os]

import jester
import dotenv

load()

const
  url = &"https://api.resrobot.se/v2.1" #location.name?input=Skagersvägen?&format=json&accessId={apiKey}

let apiKey = getEnv("API_KEY")

var client = newHttpClient()

# echo client.getContent(&"{url}/location.name?input=Uddevalla&format=json&accessId={apiKey}").parseJson()["stopLocationOrCoordLocation"][0]["StopLocation"]["extId"]

proc queryStops(query: string): JsonNode =
  result = newJArray()
  
  let
    response = client.getContent(&"{url}/location.name?input={query.encodeUrl()}?&format=json&accessId={apiKey}")
    json = response.parseJson()["stopLocationOrCoordLocation"].getElems()

  var stop: JsonNode
  for node in json:
    stop = node{"StopLocation"}
    if stop == nil:
      continue

    result.add(stop["name"])

proc getStop(stop: string): JsonNode =
  let response = client.getContent(&"{url}/location.name?input={stop.encodeUrl()}&format=json&accessId={apiKey}")
  # return response.parseJson()["StopLocation"][0]
  return response.parseJson()["stopLocationOrCoordLocation"][0]["StopLocation"]

proc queryRoutes(origin, destination: string): JsonNode =
  let
    originId = client.getContent(&"{url}/location.name?input={origin.encodeUrl()}&format=json&accessId={apiKey}").parseJson()["stopLocationOrCoordLocation"][0]["StopLocation"]["extId"].getStr()
    destinationId = client.getContent(&"{url}/location.name?input={destination.encodeUrl()}&format=json&accessId={apiKey}").parseJson()["stopLocationOrCoordLocation"][0]["StopLocation"]["extId"].getStr()

    response = client.getContent(&"{url}/trip?format=json&originId={originId}&destId={destinationId}&accessId={apiKey}")

  return response.parseJson()["Trip"]


router routes:
  get "/api/get-stop":
    resp $getStop(request.params["stop"])

  get "/api/query-stops":
    resp $queryStops(request.params["query"])

  get "/api/query-routes":
    resp $queryRoutes(request.params["origin"], request.params["destination"])

var server = initJester(routes, settings=newSettings(port=Port(8080)))
server.serve()