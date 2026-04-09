// Delhi Metro API - Netlify Serverless Function
// Rewritten from Express server to Netlify Function
// Original logic by DelhiMetroAPI, adapted for serverless by OTZUA

const path = require("path");

// ─── Priority Queue ────────────────────────────────────────────────────────────
class PriorityQueue {
  constructor() {
    this.collection = [];
  }
  enqueue(element) {
    if (this.isEmpty()) {
      this.collection.push(element);
    } else {
      let added = false;
      for (let i = 1; i <= this.collection.length; i++) {
        if (element[1] < this.collection[i - 1][1]) {
          this.collection.splice(i - 1, 0, element);
          added = true;
          break;
        }
      }
      if (!added) {
        this.collection.push(element);
      }
    }
  }
  dequeue() {
    return this.collection.shift();
  }
  isEmpty() {
    return this.collection.length === 0;
  }
}

// ─── Graph ─────────────────────────────────────────────────────────────────────
class Graph {
  constructor() {
    this.nodes = [];
    this.adjacencyList = {};
  }

  addNode(node) {
    this.nodes.push(node);
    this.adjacencyList[node] = [];
  }

  addEdge(node1, node2, weight, color) {
    this.adjacencyList[node1].push({ node: node2, weight, line: color });
    this.adjacencyList[node2].push({ node: node1, weight, line: color });
  }

  getline(sta1, sta2) {
    for (let i = 0; i < this.adjacencyList[sta1].length; i++) {
      if (this.adjacencyList[sta1][i].node === sta2) {
        return this.adjacencyList[sta1][i].line;
      }
    }
    return null;
  }

  shortestRoute(startNode, endNode) {
    if (!this.adjacencyList[startNode]) {
      return { error: `Station not found: "${startNode}"` };
    }
    if (!this.adjacencyList[endNode]) {
      return { error: `Station not found: "${endNode}"` };
    }
    if (startNode === endNode) {
      return { error: "Source and destination cannot be the same station." };
    }

    let times = {};
    let backtrace = {};
    let pq = new PriorityQueue();

    times[startNode] = 0;
    this.nodes.forEach((node) => {
      if (node !== startNode) times[node] = Infinity;
    });

    pq.enqueue([startNode, 0]);

    while (!pq.isEmpty()) {
      let shortestStep = pq.dequeue();
      let currentNode = shortestStep[0];

      this.adjacencyList[currentNode].forEach((neighbor) => {
        let time = times[currentNode] + neighbor.weight;

        if (currentNode !== startNode) {
          if (
            this.getline(currentNode, neighbor.node) !==
            this.getline(currentNode, backtrace[currentNode])
          ) {
            if (
              this.getline(currentNode, neighbor.node) === "1.2km Skywalk" ||
              this.getline(currentNode, backtrace[currentNode]) === "1.2km Skywalk"
            ) {
              time = time + 0;
            } else {
              time = time + 13;
            }
          }
        }

        if (time < times[neighbor.node]) {
          times[neighbor.node] = time;
          backtrace[neighbor.node] = currentNode;
          pq.enqueue([neighbor.node, time]);
        }
      });
    }

    if (times[endNode] === Infinity) {
      return { error: "No route found between these stations." };
    }

    let path = [endNode];
    let lastStep = endNode;

    let result = {
      line1: [],
      line2: [],
      interchange: [],
      path: null,
      time: null,
    };

    while (lastStep !== startNode) {
      if (
        backtrace[lastStep] !== undefined &&
        backtrace[backtrace[lastStep]] !== undefined
      ) {
        if (
          this.getline(lastStep, backtrace[lastStep]) !==
          this.getline(backtrace[lastStep], backtrace[backtrace[lastStep]])
        ) {
          if (backtrace[lastStep] !== startNode) {
            result.line1.unshift(
              this.getline(backtrace[lastStep], backtrace[backtrace[lastStep]])
            );
            result.line2.unshift(this.getline(lastStep, backtrace[lastStep]));
            result.interchange.unshift(backtrace[lastStep]);
          }
        }
      }

      path.unshift(backtrace[lastStep]);
      lastStep = backtrace[lastStep];
    }

    result.path = path;
    result.time = times[endNode];

    if (result.interchange.length === 0) {
      result.line1[0] = this.getline(result.path[0], result.path[1]);
    }

    return result;
  }

  getAllStations() {
    return [...this.nodes].sort();
  }
}

// ─── Build Graph ───────────────────────────────────────────────────────────────
function buildGraph() {
  const g = new Graph();
  const linesDir = path.join(__dirname, "lines");

  // Blue Line
  const blue = require(path.join(linesDir, "blue.json"));
  const blueline = blue.map((s) => s["Hindi"]);
  blueline.forEach((s) => g.addNode(s));
  for (let i = 0; i < blueline.length - 1; i++) {
    g.addEdge(blueline[i], blueline[i + 1], 2.02, "blue");
  }

  // Blue Branch
  const bluebranch = require(path.join(linesDir, "bluebranch.json"));
  const bluebranchline = bluebranch.map((s) => s["Hindi"]);
  bluebranchline.forEach((s) => {
    if (s !== "Yamuna Bank") g.addNode(s);
  });
  for (let i = 0; i < bluebranchline.length - 1; i++) {
    g.addEdge(bluebranchline[i], bluebranchline[i + 1], 1.875, "bluebranch");
  }

  // Magenta Line
  const magenta = require(path.join(linesDir, "magenta.json"));
  const magentaline = magenta.map((s) => s["25"]);
  magentaline.forEach((s) => {
    if (s !== "Janakpuri West" && s !== "Botanical Garden") g.addNode(s);
  });
  for (let i = 0; i < magentaline.length - 1; i++) {
    g.addEdge(magentaline[i], magentaline[i + 1], 2.36, "magenta");
  }

  // Yellow Line
  const yellow = require(path.join(linesDir, "yellow.json"));
  const yellowline = yellow.map((s) => s["Hindi"]);
  yellowline.forEach((s) => {
    if (s !== "Hauz Khas" && s !== "Rajiv Chowk") g.addNode(s);
  });
  for (let i = 0; i < yellowline.length - 1; i++) {
    g.addEdge(yellowline[i], yellowline[i + 1], 2.22, "yellow");
  }

  // Violet Line
  const violet = require(path.join(linesDir, "violet.json"));
  const violetline = violet.map((s) => s["Hindi"]);
  violetline.forEach((s) => {
    if (
      s !== "Kashmere Gate" &&
      s !== "Mandi House" &&
      s !== "Central Secretariat" &&
      s !== "Kalkaji Mandir"
    )
      g.addNode(s);
  });
  for (let i = 0; i < violetline.length - 1; i++) {
    g.addEdge(violetline[i], violetline[i + 1], 2.24, "violet");
  }

  // Red Line
  const red = require(path.join(linesDir, "red.json"));
  const redline = red.map((s) => s["Hindi"]);
  redline.forEach((s) => {
    if (s !== "Kashmere Gate") g.addNode(s);
  });
  for (let i = 0; i < redline.length - 1; i++) {
    g.addEdge(redline[i], redline[i + 1], 2.03, "red");
  }

  // Green Line
  const green = require(path.join(linesDir, "green.json"));
  const greenline = green.map((s) => s["Hindi"]);
  greenline.forEach((s) => {
    if (s !== "Inderlok") g.addNode(s);
  });
  for (let i = 0; i < greenline.length - 1; i++) {
    g.addEdge(greenline[i], greenline[i + 1], 2.49, "green");
  }

  // Green Branch
  const greenbranch = require(path.join(linesDir, "greenbranch.json"));
  const greenbranchline = greenbranch.map((s) => s["Hindi"]);
  greenbranchline.forEach((s) => {
    if (s !== "Kirti Nagar" && s !== "Ashok Park Main") g.addNode(s);
  });
  for (let i = 0; i < greenbranchline.length - 1; i++) {
    g.addEdge(greenbranchline[i], greenbranchline[i + 1], 1.33, "greenbranch");
  }

  // Pink Line
  const pink = require(path.join(linesDir, "pink.json"));
  const pinkline = pink.map((s) => s["Hindi"]);
  pinkline.forEach((s) => {
    if (
      s !== "Azadpur" &&
      s !== "Netaji Subhash Place" &&
      s !== "Rajouri Garden" &&
      s !== "INA" &&
      s !== "Lajpat Nagar" &&
      s !== "Mayur Vihar – I"
    )
      g.addNode(s);
  });
  for (let i = 0; i < pinkline.length - 1; i++) {
    g.addEdge(pinkline[i], pinkline[i + 1], 2.69, "pink");
  }

  // Pink Branch
  const pinkbranch = require(path.join(linesDir, "pinkbranch.json"));
  const pinkbranchline = pinkbranch.map((s) => s["Hindi"]);
  pinkbranchline.forEach((s) => {
    if (s !== "Anand Vihar" && s !== "Karkarduma" && s !== "Welcome")
      g.addNode(s);
  });
  for (let i = 0; i < pinkbranchline.length - 1; i++) {
    g.addEdge(pinkbranchline[i], pinkbranchline[i + 1], 2.43, "pinkbranch");
  }

  // Orange Line (Airport Express)
  const orange = require(path.join(linesDir, "orange.json"));
  const orangeline = orange.map((s) => s["Hindi"]);
  orangeline.forEach((s) => {
    if (s !== "New Delhi" && s !== "Dwarka Sector 21") g.addNode(s);
  });
  for (let i = 0; i < orangeline.length - 1; i++) {
    g.addEdge(orangeline[i], orangeline[i + 1], 5.2, "orange");
  }

  // Special Skywalk Connection
  g.addEdge("Dhaula Kuan", "Durgabai Deshmukh South Campus", 18, "1.2km Skywalk");

  return g;
}

// Build graph once when the function cold-starts (cached in Lambda container)
let graph;
try {
  graph = buildGraph();
} catch (err) {
  console.error("Failed to build graph:", err);
}

// ─── Netlify Handler ───────────────────────────────────────────────────────────
exports.handler = async function (event, context) {
  // CORS headers — allow any origin so your website can call this
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (!graph) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Graph failed to initialize." }),
    };
  }

  const params = event.queryStringParameters || {};
  const rawPath = event.path || "";
  const pathParts = rawPath
    .replace(/^\/\.netlify\/functions\/route/, "")
    .replace(/^\/route/, "");

  // ── GET /route/stations — list all stations
  if (pathParts === "/stations" || rawPath.endsWith("/stations") || params.action === "stations") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total: graph.getAllStations().length,
        stations: graph.getAllStations(),
      }),
    };
  }

  // ── GET /route?from=X&to=Y — find route
  const from = params.from ? params.from.trim() : null;
  const to = params.to ? params.to.trim() : null;

  if (!from || !to) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing parameters. Use: ?from=StationName&to=StationName',
        example: "?from=Rajiv Chowk&to=Hauz Khas",
        docs: "GET /route?from=SOURCE&to=DESTINATION  |  GET /route/stations",
      }),
    };
  }

  const result = graph.shortestRoute(from, to);

  if (result.error) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: result.error }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result),
  };
};
