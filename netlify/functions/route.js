// ============================================================
//  Delhi Metro API — Netlify Serverless Function
//  Powered by Dijkstra's Algorithm.
//  Supports two routing modes:
//    - "fastest"  → fewest weighted stops (default)
//    - "comfort"  → fewest interchanges; GPS coordinates used
//                   to prioritise long straight-line segments
// ============================================================

// ─── Haversine distance (km) ─────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Station Coordinates ─────────────────────────────────────
// Sourced from public/stops.txt (stop_lat, stop_lon)
// Keyed by normalised lower-case station name for fuzzy lookup.
const COORDS_RAW = {
  "dilshad garden": [28.675991, 77.321495],
  "jhilmil": [28.675648, 77.312393],
  "mansarovar park": [28.675352, 77.301178],
  "shahdara": [28.673531, 77.28727],
  "welcome": [28.671986, 77.277931],
  "seelampur": [28.670324, 77.267311],
  "shastri park": [28.668451, 77.250404],
  "kashmere gate": [28.667879, 77.228012],
  "tis hazari": [28.667137, 77.216721],
  "pul bangash": [28.66571, 77.206329],
  "pratap nagar": [28.666632, 77.196869],
  "shastri nagar": [28.670135, 77.181679],
  "inderlok": [28.673452, 77.170235],
  "kanhiya nagar": [28.682386, 77.162552],
  "keshav puram": [28.688944, 77.161774],
  "netaji subhash place": [28.695637, 77.152428],
  "netaji subash place": [28.695637, 77.152428],
  "kohat enclave": [28.697943, 77.140465],
  "pitam pura": [28.70318, 77.132355],
  "rohini east": [28.707941, 77.125732],
  "rohini west": [28.715008, 77.115746],
  "rithala": [28.720821, 77.105042],
  "mundka": [28.682411, 77.028282],
  "rajdhani park": [28.682217, 77.043869],
  "nangloi railway station": [28.682091, 77.05619],
  "nangloi railway station (nangloi)": [28.682091, 77.05619],
  "nangloi": [28.682356, 77.064728],
  "surajmal stadium": [28.681833, 77.073891],
  "udyog nagar": [28.681047, 77.078674],
  "peera garhi": [28.67972, 77.092491],
  "paschim vihar west": [28.678539, 77.102119],
  "paschim vihar east": [28.677305, 77.112251],
  "madipur": [28.676418, 77.117294],
  "shivaji park": [28.674965, 77.128258],
  "punjabi bagh": [28.672943, 77.146011],
  "ashok park main": [28.671572, 77.155159],
  "satguru ram singh marg": [28.662188, 77.157829],
  "samaypur badli": [28.742872, 77.146545],
  "rohini sector 18": [28.740192, 77.135574],
  "rohini sector 1819": [28.740192, 77.135574],
  "haiderpur": [28.718657, 77.149956],
  "jahangirpuri": [28.72818, 77.16124],
  "adarsh nagar": [28.696377, 77.208809],
  "azadpur": [28.707287, 77.179863],
  "model town": [28.702833, 77.193764],
  "gtb nagar": [28.698195, 77.206985],
  "guru tegh bahadur nagar": [28.698195, 77.206985],
  "vishwa vidyalaya": [28.694765, 77.212418],
  "vidhan sabha": [28.687845, 77.221626],
  "civil lines": [28.676945, 77.224953],
  "chandni chowk": [28.656443, 77.229218],
  "chawri bazar": [28.649635, 77.22628],
  "new delhi": [28.642944, 77.222351],
  "rajiv chowk": [28.632896, 77.219574],
  "patel chowk": [28.622967, 77.212288],
  "central secretariat": [28.614973, 77.212029],
  "udyog bhawan": [28.611525, 77.210052],
  "lok kalyan marg": [28.597519, 77.209122],
  "jor bagh": [28.587234, 77.212662],
  "ina": [28.575195, 77.209473],
  "aiims": [28.568199, 77.207947],
  "green park": [28.559853, 77.206902],
  "hauz khas": [28.543346, 77.206673],
  "malviya nagar": [28.52817, 77.205612],
  "saket": [28.520638, 77.199379],
  "qutub minar": [28.512714, 77.185791],
  "chhatarpur": [28.506584, 77.174866],
  "sultanpur": [28.499214, 77.161362],
  "ghitorni": [28.49383, 77.149071],
  "arjan garh": [28.48082, 77.12587],
  "guru dronacharya": [28.482075, 77.102219],
  "sikandarpur": [28.481352, 77.092995],
  "mg road": [28.47967, 77.080444],
  "iffco chowk": [28.472137, 77.072502],
  "huda city centre": [28.459118, 77.072586],
  "vaishali": [28.650059, 77.337608],
  "kaushambi": [28.645428, 77.322273],
  "anand vihar": [28.647005, 77.316185],
  "karkarduma": [28.648653, 77.304581],
  "preet vihar": [28.641352, 77.295158],
  "nirman vihar": [28.637049, 77.287872],
  "laxmi nagar": [28.629843, 77.276428],
  "noida city centre": [28.574593, 77.356117],
  "golf course": [28.566917, 77.345726],
  "botanical garden": [28.564198, 77.334656],
  "noida sector 18": [28.570843, 77.326088],
  "noida sector 16": [28.577921, 77.318115],
  "noida sector 15": [28.585018, 77.311584],
  "new ashok nagar": [28.58847, 77.30146],
  "mayur vihar extension": [28.594124, 77.294495],
  "mayur vihar i": [28.604425, 77.289421],
  "akshardham": [28.618364, 77.279816],
  "yamuna bank": [28.623178, 77.267937],
  "indraprastha": [28.620272, 77.250076],
  "supreme court": [28.623438, 77.2425],
  "mandi house": [28.625816, 77.234726],
  "barakhambha road": [28.629662, 77.224876],
  "ramakrishna ashram marg": [28.639217, 77.206291],
  "jhandewalan": [28.644312, 77.199791],
  "karol bagh": [28.643925, 77.188416],
  "rajendra place": [28.64241, 77.191833],
  "patel nagar": [28.645037, 77.167046],
  "shadipur": [28.65143, 77.156021],
  "kirti nagar": [28.655773, 77.148499],
  "moti nagar": [28.657803, 77.140488],
  "ramesh nagar": [28.652809, 77.131462],
  "rajouri garden": [28.649157, 77.122749],
  "tagore garden": [28.643795, 77.112747],
  "subhash nagar": [28.640381, 77.10273],
  "tilak nagar": [28.636568, 77.096336],
  "janakpuri east": [28.633121, 77.086578],
  "janakpuri west": [28.629637, 77.077866],
  "uttam nagar east": [28.624643, 77.063126],
  "uttam nagar west": [28.621672, 77.055664],
  "nawada": [28.620222, 77.044991],
  "dwarka mor": [28.619366, 77.033188],
  "dwarka": [28.614899, 77.022629],
  "dwarka sector 14": [28.602232, 77.02594],
  "dwarka sector 13": [28.59705, 77.033043],
  "dwarka sector 12": [28.592234, 77.040558],
  "dwarka sector 11": [28.58642, 77.049255],
  "dwarka sector 10": [28.581108, 77.05719],
  "dwarka sector 9": [28.574284, 77.065086],
  "dwarka sector 8": [28.565706, 77.064896],
  "dwarka sector 21": [28.552322, 77.056198],
  "ito": [28.627205, 77.240952],
  "janpath": [28.627817, 77.218956],
  "khan market": [28.602682, 77.228096],
  "jawaharlal nehru stadium": [28.590475, 77.23307],
  "jangpura": [28.583231, 77.239662],
  "lajpat nagar": [28.570705, 77.233124],
  "moolchand": [28.564629, 77.234222],
  "kailash colony": [28.554617, 77.239738],
  "nehru place": [28.551134, 77.251511],
  "kalkaji mandir": [28.549532, 77.258789],
  "govind puri": [28.544413, 77.264259],
  "harkesh nagar": [28.543194, 77.275955],
  "jasola apollo": [28.538084, 77.285538],
  "sarita vihar": [28.528622, 77.288345],
  "mohan estate": [28.51959, 77.294518],
  "tughlakabad": [28.502232, 77.29866],
  "badarpur": [28.4932, 77.30085],
  "sarai": [28.47794, 77.304932],
  "nhpc chowk": [28.462435, 77.305252],
  "mewala maharajpur": [28.4485, 77.308098],
  "sector 28": [28.440586, 77.305992],
  "badkhal mor": [28.422707, 77.310234],
  "faridabad old": [28.412172, 77.311272],
  "neelam chowk ajronda": [28.400707, 77.309105],
  "bata chowk": [28.386362, 77.298782],
  "escorts mujesar": [28.370199, 77.315002],
  "airport": [28.554869, 77.087921],
  "delhi aerocity": [28.548792, 77.120743],
  "dhaula kuan": [28.591776, 77.161545],
  "shivaji stadium": [28.629007, 77.209213],
  "delhi gate": [28.640488, 77.240303],
  "jama masjid": [28.650393, 77.237556],
  "lal qila": [28.657576, 77.236595],
  "okhla bird sanctuary": [28.552816, 77.321564],
  "kalindi kunj": [28.542835, 77.310173],
  "jasola vihar shaheen bagh": [28.546005, 77.296715],
  "okhla vihar": [28.561255, 77.291916],
  "jamia millia islamia": [28.562944, 77.286209],
  "sukhdev vihar": [28.559887, 77.275116],
  "okhla nsic": [28.554575, 77.26487],
  "majlis park": [28.724157, 77.182068],
  "shalimar bagh": [28.70182, 77.165184],
  "shakurpur": [28.685781, 77.149651],
  "punjabi bagh west": [28.672747, 77.139183],
  "esi hospital": [28.658159, 77.127319],
  "mayapuri": [28.637098, 77.129738],
  "naraina vihar": [28.624121, 77.136482],
  "delhi cantonment": [28.608641, 77.140373],
  "durgabai deshmukh south campus": [28.589376, 77.169518],
  "sir vishweshwaraiah moti bagh": [28.578529, 77.175713],
  "bhikaji cama place": [28.570208, 77.187866],
  "sarojini nagar": [28.570208, 77.187866],
  "south extension": [28.5686, 77.219818],
  "trilokpuri sanjay lake": [28.613506, 77.308678],
  "east vinod nagar mayur vihar ii": [28.620052, 77.305588],
  "mandawali west vinod nagar": [28.624861, 77.304146],
  "ip extension": [28.631599, 77.310898],
  "karkarduma court": [28.649473, 77.295341],
  "krishna nagar": [28.65782, 77.290306],
  "east azad nagar": [28.665043, 77.284599],
  "jaffrabad": [28.682943, 77.27507],
  "maujpur babarpur": [28.692057, 77.280922],
  "gokulpuri": [28.703009, 77.286301],
  "johri enclave": [28.713297, 77.290154],
  "shiv vihar": [28.721863, 77.289635],
  "sant surdas": [28.354666, 77.316261],
  "raja nahar singh": [28.339899, 77.331657],
  "vinobapuri": [28.566179, 77.249367],
  "ashram": [28.576065, 77.25753],
  "hazrat nizamuddin": [28.5889, 77.253189],
  "mayur vihar pocket i": [28.606598, 77.296326],
  "shaheed sthal": [28.670177, 77.416031],
  "hindon": [28.673508, 77.40654],
  "arthala": [28.6772, 77.391876],
  "mohan nagar": [28.67856, 77.384209],
  "shyam park": [28.678217, 77.370911],
  "major mohit sharma": [28.678095, 77.359528],
  "raj bagh": [28.677122, 77.346466],
  "shaheed nagar": [28.676615, 77.333809],
  "noida sector 34": [28.580229, 77.363518],
  "noida sector 52": [28.586849, 77.372749],
  "noida sector 61": [28.597677, 77.372368],
  "noida sector 59": [28.609089, 77.372955],
  "noida sector 62": [28.616991, 77.373611],
  "noida electronic city": [28.628685, 77.375229],
  "mundka industrial area": [28.68396, 76.989822],
  "ghevra metro station": [28.685289, 76.993584],
  "tikri kalan": [28.686899, 76.977249],
  "tikri border": [28.687876, 76.963783],
  "pandit shree ram sharma": [28.689213, 76.951088],
  "bahadurgarh city": [28.690784, 76.935265],
  "brigadier hoshiyar singh": [28.697428, 76.919128],
  "pragati maidan": [28.627817, 77.242302],
};

// Normalise a station name for COORDS lookup
function normCoord(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Get coordinates for a station (fuzzy fallback)
function getCoords(name) {
  const key = normCoord(name);
  if (COORDS_RAW[key]) return COORDS_RAW[key];
  // Partial match — first key that contains or is contained by the query
  for (const [k, v] of Object.entries(COORDS_RAW)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

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

  /**
   * Core Dijkstra — shared by both modes.
   * @param {string}  start
   * @param {string}  end
   * @param {number}  interchangePenalty  – cost added when switching lines
   * @param {number}  skywalkPenalty      – cost added when using the skywalk
   */
  _dijkstra(start, end, interchangePenalty, skywalkPenalty) {
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

        if (cur !== start && prev[cur] !== undefined) {
          const lineIn  = this.getLine(cur, prev[cur]);
          const lineOut = nb.line;
          const isSkywalk = lineIn === "1.2km Skywalk" || lineOut === "1.2km Skywalk";

          if (isSkywalk) {
            d += skywalkPenalty;
          } else if (lineIn !== lineOut) {
            d += interchangePenalty;
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

    return { path, dist: dist[end], prev };
  }

  /**
   * Calculate realistic travel time for a given path (no penalties counted).
   * Uses haversine where coords are available, otherwise falls back to edge weight.
   */
  _realisticTime(path) {
    // Average metro speed ~34 km/h; interchange walking ~7 min
    const SPEED_KMH     = 34;
    const INTERCHANGE_MIN = 7;

    let time = 0;
    let prevLine = null;

    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.adj[path[i]].find(e => e.node === path[i + 1]);
      if (!edge) continue;

      const coordA = getCoords(path[i]);
      const coordB = getCoords(path[i + 1]);

      if (coordA && coordB && edge.line !== "1.2km Skywalk") {
        const km  = haversine(coordA[0], coordA[1], coordB[0], coordB[1]);
        time += (km / SPEED_KMH) * 60; // minutes
      } else {
        time += edge.weight; // fallback to stored weight
      }

      // Add interchange walking time (not the penalty, just real walk estimate)
      if (prevLine && prevLine !== edge.line) {
        if (edge.line === "1.2km Skywalk" || prevLine === "1.2km Skywalk") {
          time += 18; // skywalk is a real ~18-min detour
        } else {
          time += INTERCHANGE_MIN;
        }
      }
      prevLine = edge.line;
    }

    return Math.round(time);
  }

  /**
   * Detect lines and interchange stations along a path.
   */
  _buildResult(path, realisticTime, mode) {
    const result = {
      line1: [], line2: [], interchange: [], path,
      time: realisticTime,
      mode,
      interchangeCount: 0,
      // Attach GPS coords for each station on the path
      pathCoords: path.map(s => {
        const c = getCoords(s);
        return c ? { station: s, lat: c[0], lon: c[1] } : { station: s, lat: null, lon: null };
      }),
    };

    for (let i = 0; i < path.length - 1; i++) {
      const line     = this.getLine(path[i], path[i + 1]);
      const prevLine = i > 0 ? this.getLine(path[i - 1], path[i]) : null;

      if (i === 0) {
        result.line1.push(line);
      } else if (prevLine && prevLine !== line &&
                 line !== "1.2km Skywalk" && prevLine !== "1.2km Skywalk") {
        if (!result.line2.includes(line)) result.line2.push(line);
        if (!result.interchange.includes(path[i])) result.interchange.push(path[i]);
        result.interchangeCount++;
      }
    }

    return result;
  }

  // ── PUBLIC API ──────────────────────────────────────────────

  /** Fastest mode: 13-min interchange penalty, skywalk treated normally */
  shortestRoute(start, end) {
    const res = this._dijkstra(start, end, 13, 0);
    if (res.error) return res;
    const time = this._realisticTime(res.path);
    return this._buildResult(res.path, time, "fastest");
  }

  /**
   * Comfort mode:
   *  - Massive interchange penalty (200 min) → algorithm almost never changes trains
   *  - Extreme skywalk penalty (500 min) → skywalk used only when no alternative exists
   *  - GPS coordinates used to report accurate km-based travel time
   *  - Returns interchangeCount + pathCoords for rich frontend display
   */
  comfortRoute(start, end) {
    const res = this._dijkstra(start, end, 200, 500);
    if (res.error) return res;
    const time = this._realisticTime(res.path);
    return this._buildResult(res.path, time, "comfort");
  }

  getAllStations() { return [...this.nodes].sort(); }
}

// ─── Inline Station Data ─────────────────────────────────────
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
    "Dwarka Sector 8","Dwarka Sector 21",
  ],
  bluebranch: [
    "Yamuna Bank","Laxmi Nagar","Nirman Vihar","Preet Vihar","Karkarduma",
    "Anand Vihar","Kaushambi","Vaishali",
  ],
  yellow: [
    "Samaypur Badli","Rohini Sector 18","Haiderpur","Jahangirpuri","Adarsh Nagar",
    "Azadpur","Model Town","GTB Nagar","Vishwa Vidyalaya","Vidhan Sabha",
    "Civil Lines","Kashmere Gate","Chandni Chowk","Chawri Bazar","New Delhi",
    "Rajiv Chowk","Patel Chowk","Central Secretariat","Udyog Bhawan",
    "Lok Kalyan Marg","Jor Bagh","INA","AIIMS","Green Park","Hauz Khas",
    "Malviya Nagar","Saket","Qutub Minar","Chhatarpur","Sultanpur","Ghitorni",
    "Arjan Garh","Guru Dronacharya","Sikandarpur","MG Road","IFFCO Chowk",
    "HUDA City Centre",
  ],
  violet: [
    "Kashmere Gate","Lal Qila","Jama Masjid","Delhi Gate","ITO","Mandi House",
    "Janpath","Central Secretariat","Khan Market","Jawaharlal Nehru Stadium",
    "Jangpura","Lajpat Nagar","Moolchand","Kailash Colony","Nehru Place",
    "Kalkaji Mandir","Govind Puri","Harkesh Nagar","Jasola Apollo","Sarita Vihar",
    "Mohan Estate","Tughlakabad","Badarpur","Sarai","NHPC Chowk","Mewala Maharajpur",
    "Sector 28","Badkhal Mor","Faridabad Old","Neelam Chowk Ajronda","Bata Chowk",
    "Escorts Mujesar","Sant Surdas","Raja Nahar Singh",
  ],
  red: [
    "Shaheed Sthal","Hindon","Arthala","Mohan Nagar","Shyam park","Major Mohit Sharma",
    "Raj Bagh","Shaheed Nagar","Dilshad Garden","Jhilmil","Mansarovar Park","Shahdara",
    "Welcome","Seelampur","Shastri Park","Kashmere Gate","Tis Hazari","Pul Bangash",
    "Pratap Nagar","Shastri Nagar","Inderlok","Kanhiya Nagar","Keshav Puram",
    "Netaji Subhash Place","Kohat Enclave","Pitam Pura","Rohini East","Rohini West","Rithala",
  ],
  green: [
    "Inderlok","Ashok Park Main","Punjabi Bagh","Shivaji Park","Madipur",
    "Paschim Vihar East","Paschim Vihar West","Peera Garhi","Udyog Nagar",
    "Surajmal Stadium","Nangloi","Nangloi Railway station","Rajdhani Park","Mundka",
    "Mundka Industrial Area","Ghevra Metro station","Tikri Kalan","Tikri Border",
    "Pandit Shree Ram Sharma","Bahadurgarh City","Brigadier Hoshiyar Singh",
  ],
  greenbranch: [
    "Ashok Park Main","Satguru Ram Singh Marg","Kirti Nagar",
  ],
  pink: [
    "Majlis Park","Azadpur","Shalimar Bagh","Netaji Subhash Place","Shakurpur",
    "Punjabi Bagh West","ESI Hospital","Rajouri Garden","Mayapuri","Naraina Vihar",
    "Delhi Cantonment","Durgabai Deshmukh South Campus","Sir Vishweshwaraiah Moti Bagh",
    "Bhikaji Cama Place","Sarojini Nagar","INA","South Extension","Lajpat Nagar",
    "Vinobapuri","Ashram","Hazrat Nizamuddin","Mayur Vihar – I","Mayur Vihar Pocket I",
  ],
  pinkbranch: [
    "Trilokpuri Sanjay Lake","East Vinod Nagar - Mayur Vihar-II","Mandawali - West Vinod Nagar",
    "IP Extension","Anand Vihar","Karkarduma","Karkarduma Court","Krishna Nagar",
    "East Azad Nagar","Welcome","Jaffrabad","Maujpur-Babarpur","Gokulpuri",
    "Johri Enclave","Shiv Vihar",
  ],
  magenta: [
    "Janakpuri West","Dabri Mor","Dashrath Puri","Palam","Sadar Bazar Cantonment",
    "Terminal 1 IGI Airport","Shankar Vihar","Vasant Vihar","Munirka","RK Puram",
    "IIT Delhi","Hauz Khas","Panchsheel Park","Chirag Delhi","Greater Kailash",
    "Nehru Enclave","Kalkaji Mandir","Okhla NSIC","Sukhdev Vihar","Jamia Millia Islamia",
    "Okhla Vihar","Jasola Vihar Shaheen Bagh","Kalindi Kunj","Okhla Bird Sanctuary",
    "Botanical Garden",
  ],
  orange: [
    "New Delhi","Shivaji Stadium","Dhaula Kuan","Delhi Aerocity","Airport","Dwarka Sector 21",
  ],
};

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

// ─── Build Graph ─────────────────────────────────────────────
function buildGraph() {
  const g = new Graph();

  for (const [line, stations] of Object.entries(LINES)) {
    const skip = SKIP[line] || [];
    stations.forEach(s => { if (!skip.includes(s)) g.addNode(s); });
    for (let i = 0; i < stations.length - 1; i++) {
      g.addNode(stations[i]);
      g.addNode(stations[i + 1]);
      g.addEdge(stations[i], stations[i + 1], WEIGHTS[line], line);
    }
  }

  // Skywalk: Dhaula Kuan ↔ Durgabai Deshmukh South Campus (~1.2 km walk, ~18 min)
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
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  if (!graph) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Graph failed to initialize." }) };
  }

  const params  = event.queryStringParameters || {};
  const rawPath = (event.path || "")
    .replace(/^\/\.netlify\/functions\/route/, "")
    .replace(/^\/route/, "");

  // GET /route/stations  OR  ?action=stations
  if (rawPath === "/stations" || params.action === "stations") {
    const stations = graph.getAllStations();
    return { statusCode: 200, headers, body: JSON.stringify({ total: stations.length, stations }) };
  }

  // GET /route?from=X&to=Y[&mode=comfort]
  const from = params.from ? params.from.trim() : null;
  const to   = params.to   ? params.to.trim()   : null;
  const mode = params.mode === "comfort" ? "comfort" : "fastest";

  if (!from || !to) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({
        error: "Missing parameters.",
        usage: "GET /route?from=STATION_A&to=STATION_B[&mode=comfort]",
        example: "/route?from=Rajiv%20Chowk&to=Hauz%20Khas",
      }),
    };
  }

  const result = mode === "comfort"
    ? graph.comfortRoute(from, to)
    : graph.shortestRoute(from, to);

  if (result.error) return { statusCode: 404, headers, body: JSON.stringify(result) };
  return { statusCode: 200, headers, body: JSON.stringify(result) };
};
