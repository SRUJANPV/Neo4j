import {
  addMovie,
  addUser,
  getGraph,
  getRecommendations,
  getSimilarUsers,
  getUserInsights,
  importCsv,
  linkUserMovie
} from "./api.js";
import {
  addMovieView,
  addUserView,
  dashboardView,
  graphView,
  importCSVView,
  insightsView,
  linkView,
  recommendationView
} from "./components.js";

const app = document.getElementById("app");

const NODE_COLORS = {
  User: "#0f766e",
  Movie: "#dc2626",
  Genre: "#2563eb",
  Actor: "#ea580c",
  Director: "#7c3aed"
};

let graphState = {
  nodes: [],
  links: [],
  svg: null,
  simulation: null,
  node: null,
  link: null,
  label: null,
  linkLabel: null,
  zoom: null,
  selectedNode: null,
  tooltip: null
};

// Helper function to show loading state
function showLoading(elementId, show) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (show) {
    const originalContent = element.innerHTML;
    element.setAttribute('data-original', originalContent);
    element.innerHTML = '<div class="spinner"></div> Loading...';
    element.disabled = true;
  } else {
    const original = element.getAttribute('data-original');
    if (original) {
      element.innerHTML = original;
      element.removeAttribute('data-original');
    }
    element.disabled = false;
  }
}

// Helper function to show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <strong>${type === 'success' ? '✓ Success' : '⚠️ Error'}</strong>
    <p style="margin-top: 4px; font-size: 0.9rem;">${message}</p>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function parseCsvList(text) {
  return String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function render(view) {
  app.classList.remove("full-width", "centered");
  
  // Add smooth page transition
  app.style.opacity = '0';
  setTimeout(() => {
    if (view === "dashboard") {
      app.innerHTML = dashboardView();
      app.classList.add("centered");
    } else if (view === "addUser") {
      app.innerHTML = addUserView();
      app.classList.add("centered");
    } else if (view === "addMovie") {
      app.innerHTML = addMovieView();
      app.classList.add("centered");
    } else if (view === "link") {
      app.innerHTML = linkView();
      app.classList.add("centered");
    } else if (view === "insights") {
      app.innerHTML = insightsView();
      app.classList.add("centered");
    } else if (view === "recommend") {
      app.innerHTML = recommendationView();
      app.classList.add("centered");
    } else if (view === "import") {
      app.innerHTML = importCSVView();
      app.classList.add("centered");
    } else if (view === "graph") {
      app.innerHTML = graphView();
      app.classList.add("full-width");
      setTimeout(() => loadGraph(), 100);
    } else {
      app.innerHTML = dashboardView();
      app.classList.add("centered");
    }
    
    app.style.opacity = '1';
  }, 200);
}

function setStatus(id, text, ok = true) {
  const el = document.getElementById(id);
  if (!el) return;
  
  el.textContent = text;
  el.style.color = ok ? "#10b981" : "#ef4444";
  el.style.background = ok ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
  el.style.padding = "12px";
  el.style.borderRadius = "12px";
  el.style.marginTop = "12px";
  
  if (!ok) {
    showToast(text, 'error');
  } else {
    showToast(text, 'success');
  }
  
  setTimeout(() => {
    if (el) {
      setTimeout(() => {
        if (el) el.textContent = '';
      }, 3000);
    }
  }, 3000);
}

function resetGraphState() {
  if (graphState.simulation) {
    graphState.simulation.stop();
  }
  graphState = {
    nodes: [],
    links: [],
    svg: null,
    simulation: null,
    node: null,
    link: null,
    label: null,
    linkLabel: null,
    zoom: null,
    selectedNode: null,
    tooltip: null
  };
}

function getSelectedUserId() {
  const node = graphState.selectedNode;
  if (!node || node.label !== "User") return null;
  return String(node.id || "").split(":").pop() || null;
}

function resetGraphView() {
  if (!graphState.svg || !graphState.zoom) return;
  
  graphState.svg
    .transition()
    .duration(500)
    .call(graphState.zoom.transform, d3.zoomIdentity);
}

function cleanGraphLayout() {
  if (!graphState.simulation) return;
  
  graphState.nodes.forEach((n) => {
    n.fx = null;
    n.fy = null;
  });
  
  graphState.simulation.force("xCluster", null);
  graphState.simulation.force("yCluster", null);
  graphState.simulation.alpha(0.5).restart();
  
  showToast("Layout cleaned and repositioned", "success");
}

function clusterGraphNodes() {
  if (!graphState.simulation || !graphState.svg) return;
  
  const width = Number(graphState.svg.attr("width")) || 1000;
  const height = Number(graphState.svg.attr("height")) || 700;
  
  const targetX = {
    User: width * 0.2,
    Movie: width * 0.5,
    Genre: width * 0.78,
    Actor: width * 0.82,
    Director: width * 0.65
  };
  
  const targetY = {
    User: height * 0.25,
    Movie: height * 0.5,
    Genre: height * 0.25,
    Actor: height * 0.75,
    Director: height * 0.7
  };
  
  graphState.simulation
    .force("xCluster", d3.forceX((d) => targetX[d.label] || width * 0.5).strength(0.25))
    .force("yCluster", d3.forceY((d) => targetY[d.label] || height * 0.5).strength(0.25))
    .alpha(0.9)
    .restart();
  
  showToast("Clustering nodes by category", "success");
}

function findNode(query) {
  const q = normalize(query);
  return graphState.nodes.find((n) => {
    const id = normalize(n.id);
    const name = normalize(n.name || "");
    return id === q || id.endsWith(`:${q}`) || name === q;
  });
}

function resetGraphVisibility() {
  if (!graphState.node) return;
  
  graphState.node.transition()
    .duration(300)
    .style("opacity", 1)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5);
    
  graphState.link.transition()
    .duration(300)
    .style("opacity", 0.85)
    .attr("stroke", "#9ca3af");
    
  graphState.label.transition()
    .duration(300)
    .style("opacity", 1);
    
  graphState.linkLabel.transition()
    .duration(300)
    .style("opacity", 0.85);
  
  const panel = document.getElementById("details-panel");
  if (panel) {
    panel.innerHTML = "✨ Click any node to explore its connections and relationships";
  }
}

function findGraphNodeById(id) {
  return graphState.nodes.find((n) => n.id === id);
}

function showNodesByCategory(category) {
  if (!graphState.nodes.length || !graphState.node) return;
  
  const matchingNodes = graphState.nodes.filter((n) => n.label === category);
  const ids = new Set(matchingNodes.map((n) => n.id));
  
  graphState.node.transition()
    .duration(300)
    .style("opacity", (d) => ids.has(d.id) ? 1 : 0.15)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5);
    
  graphState.label.transition()
    .duration(300)
    .style("opacity", (d) => ids.has(d.id) ? 1 : 0.15);
    
  graphState.link.transition()
    .duration(300)
    .style("opacity", (d) => {
      const source = d.source.id || d.source;
      const target = d.target.id || d.target;
      return ids.has(source) || ids.has(target) ? 0.85 : 0.08;
    });
    
  graphState.linkLabel.transition()
    .duration(300)
    .style("opacity", (d) => {
      const source = d.source.id || d.source;
      const target = d.target.id || d.target;
      return ids.has(source) || ids.has(target) ? 0.85 : 0.08;
    });
  
  const panel = document.getElementById("details-panel");
  if (panel) {
    panel.innerHTML = `
      <h4>📌 ${category} Nodes (${matchingNodes.length})</h4>
      <ul style="max-height: 300px; overflow-y: auto;">
        ${matchingNodes.map((n) => `<li>🎬 ${n.name || n.id}</li>`).join("")}
      </ul>
    `;
  }
}

async function applyGraphFocusFilter(mode) {
  if (!mode) {
    resetGraphVisibility();
    return;
  }
  
  if (mode === "actors") {
    const rels = new Set(["ACTED_IN"]);
    const visibleNodes = new Set();
    
    graphState.links.forEach((l) => {
      const source = l.source.id || l.source;
      const target = l.target.id || l.target;
      if (rels.has(l.type)) {
        visibleNodes.add(source);
        visibleNodes.add(target);
      }
    });
    
    graphState.link.transition()
      .duration(300)
      .style("opacity", (d) => rels.has(d.type) ? 1 : 0.06);
      
    graphState.linkLabel.transition()
      .duration(300)
      .style("opacity", (d) => rels.has(d.type) ? 1 : 0.06);
      
    graphState.node.transition()
      .duration(300)
      .style("opacity", (d) => visibleNodes.has(d.id) ? 1 : 0.1);
      
    graphState.label.transition()
      .duration(300)
      .style("opacity", (d) => visibleNodes.has(d.id) ? 1 : 0.1);
      
    showToast("Showing only actor relationships", "success");
    return;
  }
  
  if (mode === "recommendations") {
    const selectedUser = getSelectedUserId();
    if (!selectedUser) {
      showToast("Select a User node first to highlight recommended movies", "error");
      const focus = document.getElementById("graphFocusFilter");
      if (focus) focus.value = "";
      resetGraphVisibility();
      return;
    }
    
    showLoading('refreshGraph', true);
    let data;
    try {
      data = await getRecommendations(selectedUser);
    } catch {
      showLoading('refreshGraph', false);
      return;
    }
    showLoading('refreshGraph', false);
    
    const recommendedIds = new Set(
      (data.weighted || []).map((item) => `Movie:${String(item.movie_id || "").toLowerCase()}`)
    );
    const userNodeId = `User:${selectedUser}`;
    
    graphState.node.transition()
      .duration(300)
      .style("opacity", (d) => (d.id === userNodeId || recommendedIds.has(d.id)) ? 1 : 0.1)
      .attr("stroke", (d) => recommendedIds.has(d.id) ? "#f59e0b" : "#ffffff")
      .attr("stroke-width", (d) => recommendedIds.has(d.id) ? 3 : 1.5);
      
    graphState.label.transition()
      .duration(300)
      .style("opacity", (d) => (d.id === userNodeId || recommendedIds.has(d.id)) ? 1 : 0.1);
      
    graphState.link.transition()
      .duration(300)
      .style("opacity", 0.05);
      
    graphState.linkLabel.transition()
      .duration(300)
      .style("opacity", 0.05);
    
    const panel = document.getElementById("details-panel");
    if (panel) {
      panel.innerHTML = `
        <h4>🎯 Recommended Movies for ${selectedUser}</h4>
        <ul>
          ${(data.weighted || [])
            .map((item) => `<li><strong>${item.title}</strong> (${item.year || "N/A"}) - score ${item.score}</li>`)
            .join("") || "<li>No recommendations available</li>"}
        </ul>
      `;
    }
    
    showToast(`Found ${data.weighted?.length || 0} recommendations for ${selectedUser}`, "success");
    return;
  }
  
  if (mode === "similar_users") {
    const selectedUser = getSelectedUserId();
    if (!selectedUser) {
      showToast("Select a User node first to highlight similar users", "error");
      const focus = document.getElementById("graphFocusFilter");
      if (focus) focus.value = "";
      resetGraphVisibility();
      return;
    }
    
    showLoading('refreshGraph', true);
    let data;
    try {
      data = await getSimilarUsers(selectedUser);
    } catch {
      showLoading('refreshGraph', false);
      return;
    }
    showLoading('refreshGraph', false);
    
    const userNodeId = `User:${selectedUser}`;
    const similarIds = new Set((data.similar_users || []).map((u) => `User:${u.user_id}`));
    const context = new Set([userNodeId, ...similarIds]);
    
    graphState.node.transition()
      .duration(300)
      .style("opacity", (d) => context.has(d.id) ? 1 : 0.1)
      .attr("stroke", (d) => similarIds.has(d.id) ? "#111827" : "#ffffff")
      .attr("stroke-width", (d) => similarIds.has(d.id) ? 3 : 1.5);
      
    graphState.label.transition()
      .duration(300)
      .style("opacity", (d) => context.has(d.id) ? 1 : 0.1);
      
    graphState.link.transition()
      .duration(300)
      .style("opacity", (d) => {
        const source = d.source.id || d.source;
        const target = d.target.id || d.target;
        return context.has(source) || context.has(target) ? 0.7 : 0.06;
      });
      
    graphState.linkLabel.transition()
      .duration(300)
      .style("opacity", (d) => {
        const source = d.source.id || d.source;
        const target = d.target.id || d.target;
        return context.has(source) || context.has(target) ? 0.7 : 0.06;
      });
    
    const panel = document.getElementById("details-panel");
    if (panel) {
      panel.innerHTML = `
        <h4>👥 Similar Users to ${selectedUser}</h4>
        <ul>
          ${(data.similar_users || [])
            .map((item) => `<li><strong>${item.user_name}</strong> (${item.user_id}) - similarity ${item.similarity}</li>`)
            .join("") || "<li>No similar users found</li>"}
        </ul>
      `;
    }
    
    showToast(`Found ${data.similar_users?.length || 0} similar users`, "success");
  }
}

function highlightNodeByQuery(query) {
  const target = findNode(query);
  if (!target) {
    showToast(`Node "${query}" not found`, "error");
    return;
  }
  
  const connected = new Set([target.id]);
  graphState.links.forEach((l) => {
    const s = l.source.id || l.source;
    const t = l.target.id || l.target;
    if (s === target.id || t === target.id) {
      connected.add(s);
      connected.add(t);
    }
  });
  
  graphState.node.transition()
    .duration(300)
    .style("opacity", (d) => connected.has(d.id) ? 1 : 0.12)
    .attr("stroke", (d) => d.id === target.id ? "#f59e0b" : "#ffffff")
    .attr("stroke-width", (d) => d.id === target.id ? 3 : 1.5);
    
  graphState.label.transition()
    .duration(300)
    .style("opacity", (d) => connected.has(d.id) ? 1 : 0.12);
    
  graphState.link.transition()
    .duration(300)
    .style("opacity", (d) => {
      const s = d.source.id || d.source;
      const t = d.target.id || d.target;
      return connected.has(s) && connected.has(t) ? 1 : 0.08;
    });
    
  graphState.linkLabel.transition()
    .duration(300)
    .style("opacity", (d) => {
      const s = d.source.id || d.source;
      const t = d.target.id || d.target;
      return connected.has(s) && connected.has(t) ? 1 : 0.08;
    });
  
  showToast(`Found node: ${target.name || target.id}`, "success");
}

function applyRelationshipFilter(relType) {
  if (!relType) {
    resetGraphVisibility();
    return;
  }
  
  const connected = new Set();
  graphState.links.forEach((l) => {
    if (l.type === relType) {
      connected.add(l.source.id || l.source);
      connected.add(l.target.id || l.target);
    }
  });
  
  graphState.link.transition()
    .duration(300)
    .style("opacity", (d) => d.type === relType ? 1 : 0.08);
    
  graphState.linkLabel.transition()
    .duration(300)
    .style("opacity", (d) => d.type === relType ? 1 : 0.08);
    
  graphState.node.transition()
    .duration(300)
    .style("opacity", (d) => connected.has(d.id) ? 1 : 0.12);
    
  graphState.label.transition()
    .duration(300)
    .style("opacity", (d) => connected.has(d.id) ? 1 : 0.12);
  
  showToast(`Filtering by relationship: ${relType}`, "success");
}

function renderNodeDetails(nodeData) {
  const panel = document.getElementById("details-panel");
  if (!panel) return;
  
  const related = [];
  graphState.links.forEach((l) => {
    const s = l.source.id || l.source;
    const t = l.target.id || l.target;
    
    if (s === nodeData.id) {
      const targetName = (l.target.name || l.target.id || t).toString();
      related.push({ type: l.type, direction: 'out', name: targetName });
    }
    if (t === nodeData.id) {
      const sourceName = (l.source.name || l.source.id || s).toString();
      related.push({ type: l.type, direction: 'in', name: sourceName });
    }
  });
  
  const icon = {
    User: '👤',
    Movie: '🎬',
    Genre: '🏷️',
    Actor: '⭐',
    Director: '🎥'
  }[nodeData.label] || '📌';
  
  panel.innerHTML = `
    <div style="animation: fadeIn 0.3s ease-out;">
      <h4>${icon} ${nodeData.label}</h4>
      <p><strong>${nodeData.name || nodeData.id}</strong></p>
      ${nodeData.year ? `<p>📅 Year: ${nodeData.year}</p>` : ''}
      ${nodeData.age ? `<p>🎂 Age: ${nodeData.age}</p>` : ''}
      <hr style="margin: 12px 0; border-color: #e2e8f0;">
      <h5>🔗 Connections (${related.length})</h5>
      <ul style="max-height: 200px; overflow-y: auto;">
        ${related.length ? 
          related.map(item => `<li>${item.direction === 'out' ? '→' : '←'} ${item.type} ${item.direction === 'out' ? 'to' : 'from'} <strong>${item.name}</strong></li>`).join('') 
          : "<li class='muted'>No connections found</li>"
        }
      </ul>
    </div>
  `;
}

async function loadGraph() {
  resetGraphState();
  
  const container = document.getElementById("graph-container");
  if (!container) return;
  
  container.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%;"><div class="spinner" style="width: 40px; height: 40px;"></div><p style="margin-left: 12px;">Loading graph data...</p></div>';
  
  const width = Math.max(container.clientWidth, 760);
  const height = Math.max(container.clientHeight, 560);
  
  let data;
  try {
    data = await getGraph();
  } catch (err) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; padding: 40px;">
        <p class='error' style="font-size: 1.1rem;">⚠️ Unable to load graph: ${err.message}</p>
        <p class='muted' style="margin-top: 12px;">Make sure Neo4j is running on bolt://localhost:7687, then refresh.</p>
      </div>
    `;
    return;
  }
  
  if (!data.nodes || data.nodes.length === 0) {
    container.innerHTML = "<div style='display: flex; justify-content: center; align-items: center; height: 100%;'><p class='muted'>No graph data found. Seed the database first.</p></div>";
    return;
  }
  
  const nodes = data.nodes.map((n) => ({ ...n }));
  const links = data.links.map((l) => ({ ...l }));
  
  container.innerHTML = "";
  
  const svg = d3
    .select(container)
    .append("svg")
    .attr("id", "graphSvg")
    .attr("width", width)
    .attr("height", height)
    .style("cursor", "grab");
  
  const defs = svg.append("defs");
  
  // Add gradient definitions
  const createGradient = (id, color1, color2) => {
    const grad = defs.append("radialGradient").attr("id", id).attr("gradientUnits", "objectBoundingBox");
    grad.append("stop").attr("offset", "0%").attr("stop-color", color1).attr("stop-opacity", 1);
    grad.append("stop").attr("offset", "100%").attr("stop-color", color2).attr("stop-opacity", 1);
    return grad;
  };
  
  const gradients = {
    User: createGradient("gradUser", "#0d9488", "#0f766e"),
    Movie: createGradient("gradMovie", "#ef4444", "#dc2626"),
    Genre: createGradient("gradGenre", "#3b82f6", "#2563eb"),
    Actor: createGradient("gradActor", "#f97316", "#ea580c"),
    Director: createGradient("gradDirector", "#8b5cf6", "#7c3aed")
      .append("stop").attr("offset", "100%").attr("stop-color", "#7c3aed").attr("stop-opacity", 1)
  };
  
  const g = svg.append("g");
  
  const zoom = d3
    .zoom()
    .scaleExtent([0.2, 5])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  svg.call(zoom);
  
  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(150).strength(0.5))
    .force("charge", d3.forceManyBody().strength(-500).distanceMin(50).distanceMax(300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius((d) => (d.label === "Movie" ? 22 : 18)).strength(0.7));
  
  const link = g
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#cbd5e1")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.7)
    .attr("stroke-dasharray", (d) => d.type === "RATED" ? "5,5" : "none");
  
  const linkLabel = g
    .append("g")
    .selectAll("text")
    .data(links)
    .join("text")
    .text((d) => d.type)
    .attr("font-size", "9px")
    .attr("fill", "#64748b")
    .attr("text-anchor", "middle")
    .attr("opacity", 0.8)
    .attr("font-weight", "500");
  
  const node = g
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", (d) => (d.label === "Movie" ? 14 : 11))
    .attr("fill", (d) => `url(#grad${d.label})`)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2)
    .attr("cursor", "pointer")
    .call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          svg.style("cursor", "grabbing");
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          svg.style("cursor", "grab");
        })
    );
  
  const label = g
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((d) => (d.name || d.id).length > 20 ? (d.name || d.id).substring(0, 17) + "..." : (d.name || d.id))
    .attr("font-size", "10px")
    .attr("font-weight", "500")
    .attr("text-anchor", "middle")
    .attr("fill", "#1e293b")
    .attr("dy", 18);
  
  // Add hover effects
  node.on("mouseenter", function(event, d) {
    d3.select(this)
      .transition()
      .duration(200)
      .attr("r", (d) => (d.label === "Movie" ? 18 : 15))
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 3);
      
    label.filter(n => n.id === d.id)
      .transition()
      .duration(200)
      .attr("font-size", "12px")
      .attr("font-weight", "700")
      .attr("fill", "#0f766e");
  }).on("mouseleave", function(event, d) {
    d3.select(this)
      .transition()
      .duration(200)
      .attr("r", (d) => (d.label === "Movie" ? 14 : 11))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);
      
    label.filter(n => n.id === d.id)
      .transition()
      .duration(200)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#1e293b");
  });
  
  node.on("click", (event, d) => {
    event.stopPropagation();
    graphState.selectedNode = d;
    renderNodeDetails(d);
    
    // Highlight clicked node
    node.attr("stroke", (n) => n.id === d.id ? "#f59e0b" : "#ffffff")
        .attr("stroke-width", (n) => n.id === d.id ? 3 : 2);
  });
  
  svg.on("click", () => {
    const panel = document.getElementById("details-panel");
    if (panel) {
      panel.innerHTML = "✨ Click any node to explore its connections and relationships";
    }
    node.attr("stroke", "#ffffff").attr("stroke-width", 2);
  });
  
  simulation.on("tick", () => {
    node
      .attr("cx", (d) => Math.max(10, Math.min(width - 10, d.x)))
      .attr("cy", (d) => Math.max(10, Math.min(height - 10, d.y)));
    
    label
      .attr("x", (d) => Math.max(10, Math.min(width - 10, d.x)))
      .attr("y", (d) => Math.max(10, Math.min(height - 10, d.y)) + 18);
    
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    
    linkLabel
      .attr("x", (d) => (d.source.x + d.target.x) / 2)
      .attr("y", (d) => (d.source.y + d.target.y) / 2 - 5);
  });
  
  graphState = {
    nodes,
    links,
    svg,
    simulation,
    node,
    link,
    label,
    linkLabel,
    zoom,
    selectedNode: null,
    tooltip: null
  };
  
  showToast(`Loaded ${nodes.length} nodes and ${links.length} connections`, "success");
}

function formatSimpleMovieRows(items, emptyText) {
  if (!items || items.length === 0) {
    return `<p class='muted'>${emptyText}</p>`;
  }
  
  return `
    <div style="display: grid; gap: 12px;">
      ${items
        .map((item) => `
          <div style="padding: 12px; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius: 12px; border-left: 4px solid #0f766e;">
            <strong>🎬 ${item.title}</strong> (${item.year || "N/A"})<br>
            <small class="muted">Score: ${item.score}</small>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function formatWeightedRows(items) {
  if (!items || items.length === 0) {
    return "<p class='muted'>No weighted recommendations available.</p>";
  }
  
  return `
    <div style="display: grid; gap: 12px;">
      ${items
        .map(
          (item) => `
            <div style="padding: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border-radius: 12px; border-left: 4px solid #10b981;">
              <strong>🎯 ${item.title}</strong> (${item.year || "N/A"})<br>
              <small>Score: ${item.score} | 👥 Similar users: ${item.signals.similar_users} | 🏷️ Shared genres: ${item.signals.shared_genres}</small>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function formatSimilarRows(items) {
  if (!items || items.length === 0) {
    return "<p class='muted'>No similar users found.</p>";
  }
  
  return `
    <div style="display: grid; gap: 12px;">
      ${items
        .map(
          (u) => `
            <div style="padding: 12px; background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); border-radius: 12px; border-left: 4px solid #3b82f6;">
              <strong>👤 ${u.user_name}</strong> (${u.user_id})<br>
              <small>Overlap: ${u.similarity} shared movies</small>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

// Event Listeners
document.addEventListener("click", async (event) => {
  const navBtn = event.target.closest("[data-view]");
  if (navBtn) {
    render(navBtn.dataset.view);
    return;
  }
  
  const categoryBtn = event.target.closest("[data-node-category]");
  if (categoryBtn && graphState.node) {
    const relFilter = document.getElementById("relFilter");
    if (relFilter) relFilter.value = "";
    
    const graphFocusFilter = document.getElementById("graphFocusFilter");
    if (graphFocusFilter) graphFocusFilter.value = "";
    
    showNodesByCategory(categoryBtn.dataset.nodeCategory);
    return;
  }
  
  if (event.target.id === "submitUser") {
    const user_id = document.getElementById("userId")?.value;
    const name = document.getElementById("userName")?.value;
    const age = Number(document.getElementById("userAge")?.value || 0);
    const preferences = parseCsvList(document.getElementById("userPreferences")?.value);
    
    if (!user_id || !name) {
      setStatus("userStatus", "Please fill in User ID and Name", false);
      return;
    }
    
    showLoading('submitUser', true);
    try {
      const result = await addUser({ user_id, name, age, preferences });
      setStatus("userStatus", result.status || "User added successfully!");
      document.getElementById("userId").value = "";
      document.getElementById("userName").value = "";
      document.getElementById("userAge").value = "";
      document.getElementById("userPreferences").value = "";
    } catch (err) {
      setStatus("userStatus", err.message, false);
    }
    showLoading('submitUser', false);
    return;
  }
  
  if (event.target.id === "submitMovie") {
    const movie_id = document.getElementById("movieId")?.value;
    const title = document.getElementById("movieTitle")?.value;
    const year = Number(document.getElementById("movieYear")?.value || 0);
    const genres = parseCsvList(document.getElementById("movieGenres")?.value);
    const actors = parseCsvList(document.getElementById("movieActors")?.value);
    const directors = parseCsvList(document.getElementById("movieDirectors")?.value);
    
    if (!movie_id || !title) {
      setStatus("movieStatus", "Please fill in Movie ID and Title", false);
      return;
    }
    
    showLoading('submitMovie', true);
    try {
      const result = await addMovie({ movie_id, title, year, genres, actors, directors });
      setStatus("movieStatus", result.status || "Movie saved successfully!");
      document.getElementById("movieId").value = "";
      document.getElementById("movieTitle").value = "";
      document.getElementById("movieYear").value = "";
      document.getElementById("movieGenres").value = "";
      document.getElementById("movieActors").value = "";
      document.getElementById("movieDirectors").value = "";
    } catch (err) {
      setStatus("movieStatus", err.message, false);
    }
    showLoading('submitMovie', false);
    return;
  }
  
  if (event.target.id === "linkUserMovieBtn") {
    const user_id = document.getElementById("linkUserId")?.value;
    const movie_id = document.getElementById("linkMovieId")?.value;
    const action = document.getElementById("linkAction")?.value;
    const ratingRaw = document.getElementById("linkRating")?.value;
    const rating = ratingRaw ? Number(ratingRaw) : null;
    
    if (!user_id || !movie_id) {
      setStatus("linkStatus", "Please fill in User ID and Movie ID", false);
      return;
    }
    
    if (action === "RATED" && (rating === null || rating < 0 || rating > 5)) {
      setStatus("linkStatus", "Please provide a valid rating (0-5)", false);
      return;
    }
    
    showLoading('linkUserMovieBtn', true);
    try {
      const result = await linkUserMovie({ user_id, movie_id, action, rating });
      setStatus("linkStatus", result.status || "Activity linked successfully!");
      document.getElementById("linkUserId").value = "";
      document.getElementById("linkMovieId").value = "";
      document.getElementById("linkRating").value = "";
    } catch (err) {
      setStatus("linkStatus", err.message, false);
    }
    showLoading('linkUserMovieBtn', false);
    return;
  }
  
  if (event.target.id === "fetchInsights") {
    const userId = document.getElementById("insightUserId")?.value;
    const target = document.getElementById("insightResult");
    if (!userId) {
      target.innerHTML = "<p class='error'>Please enter a User ID</p>";
      return;
    }
    
    target.innerHTML = '<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div> Loading insights...</div>';
    
    try {
      const data = await getUserInsights(userId);
      target.innerHTML = `
        <div style="animation: fadeIn 0.3s ease-out;">
          <h4 style="color: #0f766e;">👤 ${data.user_name} (${data.user_id})</h4>
          <p><strong>🎂 Age:</strong> ${data.age || "N/A"}</p>
          <p><strong>👁️ Watched Movies:</strong> ${(data.watched_movies || []).join(", ") || "None"}</p>
          <p><strong>❤️ Liked Movies:</strong> ${(data.liked_movies || []).join(", ") || "None"}</p>
          <p><strong>🏷️ Top Genres:</strong> ${(data.genre_preferences || []).map((g) => `${g.genre} (${g.preference})`).join(", ") || "None"}</p>
          <p><strong>⭐ Favorite Actors:</strong> ${(data.favorite_actors || []).join(", ") || "None"}</p>
          <p><strong>🎥 Favorite Directors:</strong> ${(data.favorite_directors || []).join(", ") || "None"}</p>
        </div>
      `;
    } catch (err) {
      target.innerHTML = `<p class='error'>❌ ${err.message}</p>`;
    }
    return;
  }
  
  if (event.target.id === "fetchRecommendations") {
    const userId = document.getElementById("recUserId")?.value;
    const target = document.getElementById("recommendResult");
    if (!userId) {
      target.innerHTML = "<p class='error'>Please enter a User ID</p>";
      return;
    }
    
    target.innerHTML = '<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div> Generating recommendations...</div>';
    
    try {
      const data = await getRecommendations(userId);
      target.innerHTML = `
        <div style="animation: fadeIn 0.3s ease-out;">
          <h4>🤝 Collaborative Recommendations</h4>
          ${formatSimpleMovieRows(data.collaborative, "No collaborative recommendations found.")}
          <h4 style="margin-top: 20px;">📚 Content-Based Recommendations</h4>
          ${formatSimpleMovieRows(data.content_based, "No content-based recommendations found.")}
          <h4 style="margin-top: 20px;">⚡ Weighted Recommendation Score</h4>
          ${formatWeightedRows(data.weighted)}
        </div>
      `;
    } catch (err) {
      target.innerHTML = `<p class='error'>❌ ${err.message}</p>`;
    }
    return;
  }
  
  if (event.target.id === "fetchSimilar") {
    const userId = document.getElementById("recUserId")?.value;
    const target = document.getElementById("similarResult");
    if (!userId) {
      target.innerHTML = "<p class='error'>Please enter a User ID</p>";
      return;
    }
    
    target.innerHTML = '<div style="display: flex; align-items: center; gap: 12px;"><div class="spinner"></div> Finding similar users...</div>';
    
    try {
      const data = await getSimilarUsers(userId);
      target.innerHTML = `
        <div style="animation: fadeIn 0.3s ease-out;">
          <h4>👥 Similar Users</h4>
          ${formatSimilarRows(data.similar_users)}
        </div>
      `;
    } catch (err) {
      target.innerHTML = `<p class='error'>❌ ${err.message}</p>`;
    }
    return;
  }
  
  if (event.target.id === "uploadCSV") {
    const file = document.getElementById("csvFile")?.files?.[0];
    if (!file) {
      setStatus("csvStatus", "Please select a CSV file", false);
      return;
    }
    
    showLoading('uploadCSV', true);
    try {
      const result = await importCsv(file);
      setStatus("csvStatus", `✅ Imported ${result.rows || 0} rows successfully`);
      document.getElementById("csvFile").value = "";
    } catch (err) {
      setStatus("csvStatus", err.message, false);
    }
    showLoading('uploadCSV', false);
    return;
  }
  
  if (event.target.id === "refreshGraph" && graphState.svg) {
    loadGraph();
    return;
  }
  
  if (event.target.id === "findNode") {
    const value = document.getElementById("nodeSearch")?.value;
    if (!value) {
      showToast("Please enter a node name or ID to search", "error");
      return;
    }
    highlightNodeByQuery(value);
    return;
  }
  
  if (event.target.id === "resetFilterBtn") {
    const relFilter = document.getElementById("relFilter");
    if (relFilter) relFilter.value = "";
    const graphFocusFilter = document.getElementById("graphFocusFilter");
    if (graphFocusFilter) graphFocusFilter.value = "";
    const search = document.getElementById("nodeSearch");
    if (search) search.value = "";
    resetGraphVisibility();
    showToast("All filters cleared", "success");
    return;
  }
  
  if (event.target.id === "clearSearchBtn") {
    const search = document.getElementById("nodeSearch");
    if (search) search.value = "";
    resetGraphVisibility();
    showToast("Search cleared", "success");
    return;
  }
  
  if (event.target.id === "resetViewBtn") {
    resetGraphView();
    showToast("View reset to default", "success");
    return;
  }
  
  if (event.target.id === "cleanLayoutBtn") {
    cleanGraphLayout();
    return;
  }
  
  if (event.target.id === "clusterGraphBtn") {
    clusterGraphNodes();
    return;
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.id === "relFilter" && graphState.node) {
    applyRelationshipFilter(event.target.value);
    return;
  }
  
  if (event.target.id === "graphFocusFilter" && graphState.node) {
    await applyGraphFocusFilter(event.target.value);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  render("dashboard");
});