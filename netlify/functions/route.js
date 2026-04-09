// ============================================================
//  Delhi Metro API — Netlify Serverless Function
//  All station data is embedded inline (no file-system deps).
//  Powered by Dijkstra's Algorithm.
// ============================================================

// ─── Priority Queue ──────────────────────────────────────────
class PriorityQueue {
  constructor() { this.items = []; }
  enqueue(el) {
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (el[1] < this.items[i][1]) { this.items.splice(i, 0, el); added = true; break; }
    }
    if (!added) this.items.push(el);
  }
  dequeue() { return this.items.shift(); }
  isEmpty()  { return this.items.length === 0; }
}

// ─── Graph ───────────────────────────────────────────────────
class Graph {
  constructor() { this.nodes = []; this.adj = {}; }

  // Idempotent — safe to call multiple times for the same node
  addNode(n) {
    if (!this.adj[n]) { this.nodes.push(n); this.adj[n] = []; }
  }

  addEdge(a, b, w, line) {
    this.adj[a].push({ node: b, weight: w, line });
    this.adj[b].push({ node: a, weight: w, line });
  }

  getLine(a, b) {
    const edge = this.adj[a] && this.adj[a].find(e => e.node === b);
    return edge ? edge.line : null;
  }

  shortestRoute(start, end) {
    if (!this.adj[start]) return { error: `Station not found: "${start}"` };
    if (!this.adj[end])   return { error: `Station not found: "${end}"` };
    if (start === end)    return { error: "Source and destination cannot be the same." };

    const dist = {}, prev = {}, pq = new PriorityQueue();
    this.nodes.forEach(n => { dist[n] = n === start ? 0 : Infinity; });
    pq.enqueue([start, 0]);

    while (!pq.isEmpty()) {
      const [cur] = pq.dequeue();
      for (const nb of this.adj[cur]) {
        let d = dist[cur] + nb.weight;
        // Interchange penalty = 13 min (except Skywalk)
        if (cur !== start && prev[cur] !== undefined) {
          const lineIn  = this.getLine(cur, prev[cur]);
          const lineOut = this.getLine(cur, nb.node);
          if (lineIn !== lineOut && lineIn !== "1.2km Skywalk" && lineOut !== "1.2km Skywalk") {
            d += 13;
          }
        }
        if (d < dist[nb.node]) {
          dist[nb.node] = d;
          prev[nb.node] = cur;
          pq.enqueue([nb.node, d]);
        }
      }
    }

    if (!isFinite(dist[end])) return { error: "No route found between these stations." };

    // Reconstruct path
    const path = [];
    let cur = end;
    while (cur !== undefined) { path.unshift(cur); cur = prev[cur]; }

    // Detect lines and interchanges
    const result = { line1: [], line2: [], interchange: [], path, time: dist[end] };

    for (let i = 0; i < path.length - 1; i++) {
      const line = this.getLine(path[i], path[i + 1]);
      const prevLine = i > 0 ? this.getLine(path[i - 1], path[i]) : null;
      if (i === 0) {
        result.line1.push(line);
      } else if (prevLine && prevLine !== line && line !== "1.2km Skywalk" && prevLine !== "1.2km Skywalk") {
        if (!result.line2.includes(line)) result.line2.push(line);
        if (!result.interchange.includes(path[i])) result.interchange.push(path[i]);
      }
    }

    return result;
  }

  getAllStations() { return [...this.nodes].sort(); }
}

// ─── Inline Station Data ─────────────────────────────────────
//  All data extracted from the original JSON files.
//  Key: line color name, Value: [array of station names in order]

const LINES = {
  blue: [
    "Noida Electronic City","Noida Sector 62","Noida Sector 59","Noida Sector 61",
    "Noida Sector 52","Noida Sector 34","Noida City Centre","Golf Course",
    "Botanical Garden","Noida Sector 18","Noida Sector 16","Noida Sector 15",
    "New Ashok Nagar","Mayur Vihar Extension","Mayur Vihar – I","Akshardham",
    "Yamuna Bank","Indraprastha","Pragati Maidan","Mandi House","Barakhambha Road",
    "Rajiv Chowk","Ramakrishna Ashram Marg","Jhandewalan","Karol Bagh",
    "Rajendra Place","Patel Nagar","Shadipur","Kirti Nagar","Moti Nagar",
    "Ramesh Nagar","Rajouri Garden","Tagore Garden","Subhash Nagar","Tilak Nagar",
    "Janakpuri East","Janakpuri West","Uttam Nagar East","Uttam Nagar West",
    "Nawada","Dwarka Mor","Dwarka","Dwarka Sector 14","Dwarka Sector 13",
    "Dwarka Sector 12","Dwarka Sector 11","Dwarka Sector 10","Dwarka Sector 9",
    "Dwarka Sector 8","Dwarka Sector 21"
  ],
  bluebranch: [
    "Yamuna Bank","Laxmi Nagar","Nirman Vihar","Preet Vihar","Karkarduma",
    "Anand Vihar","Kaushambi","Vaishali","Vaishali Extension","Vasundhra Sector 14",
    "Sahibabad","Mohan Nagar"
  ],
  yellow: [
    "Samaypur Badli","Rohini Sector 18","Haiderpur","Jahangirpuri","Adarsh Nagar",
    "Azadpur","Model Town","GTB Nagar","Vishwa Vidyalaya","Vidhan Sabha",
    "Civil Lines","Kashmere Gate","Chandni Chowk","Chawri Bazar","New Delhi",
    "Rajiv Chowk","Patel Chowk","Central Secretariat","Udyog Bhawan",
    "Lok Kalyan Marg","Jor Bagh","INA","AIIMS","Green Park","Hauz Khas",
    "Malviya Nagar","Saket","Qutub Minar","Chhatarpur","Sultanpur","Ghitorni",
    "Arjan Garh","Guru Dronacharya","Sikandarpur","MG Road","IFFCO Chowk",
    "HUDA City Centre"
  ],
  violet: [
    "Kashmere Gate","Lal Qila","Jama Masjid","Delhi Gate","ITO","Mandi House",
    "Janpath","Central Secretariat","Khan Market","Jawaharlal Nehru Stadium",
    "Jangpura","Lajpat Nagar","Moolchand","Kailash Colony","Nehru Place",
    "Kalkaji Mandir","Govind Puri","Harkesh Nagar","Jasola Apollo","Sarita Vihar",
    "Mohan Estate","Tughlakabad","Badarpur","Sarai","NHPC Chowk","Mewala Maharajpur",
    "Sector 28","Badkhal Mor","Faridabad Old","Neelam Chowk Ajronda","Bata Chowk",
    "Escorts Mujesar","Sant Surdas","Raja Nahar Singh"
  ],
  red: [
    "Shaheed Sthal","Hindon","Arthala","Mohan Nagar","Shyam park","Major Mohit Sharma",
    "Raj Bagh","Shaheed Nagar","Dilshad Garden","Jhilmil","Mansarovar Park","Shahdara",
    "Welcome","Seelampur","Shastri Park","Kashmere Gate","Tis Hazari","Pul Bangash",
    "Pratap Nagar","Shastri Nagar","Inderlok","Kanhiya Nagar","Keshav Puram",
    "Netaji Subhash Place","Kohat Enclave","Pitam Pura","Rohini East","Rohini West","Rithala"
  ],
  green: [
    "Inderlok","Ashok Park Main","Punjabi Bagh","Shivaji Park","Madipur",
    "Paschim Vihar East","Paschim Vihar West","Peera Garhi","Udyog Nagar",
    "Surajmal Stadium","Nangloi","Nangloi Railway station","Rajdhani Park","Mundka",
    "Mundka Industrial Area","Ghevra Metro station","Tikri Kalan","Tikri Border",
    "Pandit Shree Ram Sharma","Bahadurgarh City","Brigadier Hoshiyar Singh"
  ],
  greenbranch: [
    "Ashok Park Main","Satguru Ram Singh Marg","Kirti Nagar"
  ],
  pink: [
    "Majlis Park","Azadpur","Shalimar Bagh","Netaji Subhash Place","Shakurpur",
    "Punjabi Bagh West","ESI Hospital","Rajouri Garden","Mayapuri","Naraina Vihar",
    "Delhi Cantonment","Durgabai Deshmukh South Campus","Sir Vishweshwaraiah Moti Bagh",
    "Bhikaji Cama Place","Sarojini Nagar","INA","South Extension","Lajpat Nagar",
    "Vinobapuri","Ashram","Hazrat Nizamuddin","Mayur Vihar – I","Mayur Vihar Pocket I"
  ],
  pinkbranch: [
    "Trilokpuri Sanjay Lake","East Vinod Nagar - Mayur Vihar-II","Mandawali - West Vinod Nagar",
    "IP Extension","Anand Vihar","Karkarduma","Karkarduma Court","Krishna Nagar",
    "East Azad Nagar","Welcome","Jaffrabad","Maujpur-Babarpur","Gokulpuri",
    "Johri Enclave","Shiv Vihar"
  ],
  magenta: [
    "Janakpuri West","Dabri Mor","Dashrath Puri","Palam","Sadar Bazar Cantonment",
    "Terminal 1 IGI Airport","Shankar Vihar","Vasant Vihar","Munirka","RK Puram",
    "IIT Delhi","Hauz Khas","Panchsheel Park","Chirag Delhi","Greater Kailash",
    "Nehru Enclave","Kalkaji Mandir","Okhla NSIC","Sukhdev Vihar","Jamia Millia Islamia",
    "Okhla Vihar","Jasola Vihar Shaheen Bagh","Kalindi Kunj","Okhla Bird Sanctuary",
    "Botanical Garden"
  ],
  orange: [
    "New Delhi","Shivaji Stadium","Dhaula Kuan","Delhi Aerocity","Airport","Dwarka Sector 21"
  ],
};

// Stations that are shared between lines (already added by a prior line)
const SKIP = {
  bluebranch:  ["Yamuna Bank"],
  yellow:      ["Hauz Khas","Rajiv Chowk"],
  violet:      ["Kashmere Gate","Mandi House","Central Secretariat","Kalkaji Mandir"],
  red:         ["Kashmere Gate"],
  green:       ["Inderlok"],
  greenbranch: ["Kirti Nagar","Ashok Park Main"],
  pink:        ["Azadpur","Netaji Subhash Place","Rajouri Garden","INA","Lajpat Nagar","Mayur Vihar – I"],
  pinkbranch:  ["Anand Vihar","Karkarduma","Welcome"],
  magenta:     ["Janakpuri West","Botanical Garden","Kalkaji Mandir","Hauz Khas"],
  orange:      ["New Delhi","Dwarka Sector 21"],
};

const WEIGHTS = {
  blue: 2.02, bluebranch: 1.875, yellow: 2.22, violet: 2.24, red: 2.03,
  green: 2.49, greenbranch: 1.33, pink: 2.69, pinkbranch: 2.43,
  magenta: 2.36, orange: 5.2,
};

// ─── Build Graph (runs once on cold start) ───────────────────
function buildGraph() {
  const g = new Graph();

  for (const [line, stations] of Object.entries(LINES)) {
    const skip = SKIP[line] || [];
    // Add nodes for stations not in the skip list for this line
    stations.forEach(s => { if (!skip.includes(s)) g.addNode(s); });
    // Always ensure BOTH endpoints exist before adding an edge
    // (a skipped station may still need to be a node for cross-line edges)
    for (let i = 0; i < stations.length - 1; i++) {
      g.addNode(stations[i]);     // idempotent
      g.addNode(stations[i + 1]); // idempotent
      g.addEdge(stations[i], stations[i + 1], WEIGHTS[line], line);
    }
  }

  // Special Skywalk connection (both stations already in pink line, but addNode is safe)
  g.addNode("Dhaula Kuan");
  g.addNode("Durgabai Deshmukh South Campus");
  g.addEdge("Dhaula Kuan", "Durgabai Deshmukh South Campus", 18, "1.2km Skywalk");

  return g;
}

let graph;
try {
  graph = buildGraph();
  console.log(`[Metro API] Graph ready: ${graph.nodes.length} stations`);
} catch (err) {
  console.error("[Metro API] Graph build failed:", err);
}

// ─── Netlify Handler ─────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  if (!graph) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Graph failed to initialize." }) };
  }

  const params = event.queryStringParameters || {};
  const rawPath = (event.path || "").replace(/^\/\.netlify\/functions\/route/, "").replace(/^\/route/, "");

  // GET /route/stations  OR  ?action=stations
  if (rawPath === "/stations" || params.action === "stations") {
    const stations = graph.getAllStations();
    return { statusCode: 200, headers, body: JSON.stringify({ total: stations.length, stations }) };
  }

  // GET /route?from=X&to=Y
  const from = params.from ? params.from.trim() : null;
  const to   = params.to   ? params.to.trim()   : null;

  if (!from || !to) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({
        error: "Missing parameters.",
        usage: "GET /route?from=STATION_A&to=STATION_B",
        example: "/route?from=Rajiv%20Chowk&to=Hauz%20Khas",
      }),
    };
  }

  const result = graph.shortestRoute(from, to);
  if (result.error) return { statusCode: 404, headers, body: JSON.stringify(result) };
  return { statusCode: 200, headers, body: JSON.stringify(result) };
};
