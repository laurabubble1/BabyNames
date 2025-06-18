// NOTE: This is a template. You must load your CSV/JSON data and implement the visualizations.
// Example data loading:
// d3.csv('national_names.csv').then(data => { ... });
// d3.csv('department_names.csv').then(data => { ... });

let data = [];
d3.dsv(";", "dpt2020.csv").then((loaddata) => {
  // Only keep rows with a valid year (annais is a number)
  data = loaddata
    .filter(
      (d) =>
        d.preusuel &&
        !isNaN(+d.annais) &&
        d.annais !== "" &&
        d.annais !== "XXXX"
    )
    .map((d) => ({
      sexe: d.sexe,
      preusuel: d.preusuel,
      annais: +d.annais,
      dpt: d.dpt,
      nombre: +d.nombre,
    }));
  console.log(data);
});
// Visualization 1: Name Trends Over Time (Line Chart)
function updateViz1() {
  // TODO: Parse input, filter data, and draw line chart for selected names
  // Get the input names (comma-separated)
  if (!data.length) {
    alert("Please load the data first.");
    return;
  }
  const input = document.getElementById("name-select").value;
  const names = input
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter((d) => d);

  // Filter data for selected names
  const filtered = data.filter(
    (d) => d.preusuel && names.includes(d.preusuel.toUpperCase())
  );

  // Group data by name and year, sum counts
  const nested = d3
    .groups(
      filtered,
      (d) => d.preusuel,
      (d) => d.annais
    )
    .map(([name, years]) => ({
      name,
      values: years
        .map(([year, records]) => ({
          year: +year,
          count: d3.sum(records, (r) => r.nombre),
        }))
        .sort((a, b) => a.year - b.year),
    }));

  // Set up SVG
  const margin = { top: 30, right: 30, bottom: 40, left: 50 };
  const width = 700 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  d3.select("#viz1-svg").selectAll("*").remove();

  // Select the existing SVG, set its size, and append a group for the chart
  const svg = d3
    .select("#viz1-svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X and Y scales
  const allYears = Array.from(new Set(filtered.map((d) => d.annais))).sort(
    (a, b) => a - b
  );
  const x = d3.scaleLinear().domain(d3.extent(allYears)).range([0, width]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(nested, (d) => d3.max(d.values, (v) => v.count)) || 1])
    .nice()
    .range([height, 0]);

  // Axes
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").call(d3.axisLeft(y));

  // Color scale
  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(names);

  // Draw lines
  const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.count));

  nested.forEach((d) => {
    svg
      .append("path")
      .datum(d.values)
      .attr("fill", "none")
      .attr("stroke", color(d.name))
      .attr("stroke-width", 2)
      .attr("d", line);
  });

  // Legend
  const legendGroup = svg
    .append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${width}, ${-margin.top + 10})`)
    .attr("text-anchor", "end");

  const legendSpacing = 100; // space between legends

  nested.forEach((d, i) => {
    const legend = legendGroup.append("g")
      .attr("transform", `translate(${-i * legendSpacing}, 0)`);

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 4)
      .attr("width", 12)
      .attr("height", 2)
      .style("fill", color(d.name));

    legend.append("text")
      .attr("x", -6)
      .attr("y", 6)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .text(d.name);
  });

  // Axis labels
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .text("Year");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .text("Number of Babies");
}

// Button click
document.getElementById("update-viz1").onclick = updateViz1;

// Enter key on input
document.getElementById("name-select").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    updateViz1();
  }
});

// Visualization 2: Regional Popularity (Choropleth Map)
function updateViz2() {
  // Get the input names (comma-separated)
  if (!data.length) {
    alert("Please load the data first.");
    return;
  }
  const input = document.getElementById("region-name-select").value;
  const names = input
    .split(",")
    .map((n) => n.trim().toUpperCase())
    .filter((n) => n);

  if (!names.length) {
    alert("Please enter at least one name.");
    return;
  }

  // Load GeoJSON data for French departments
  d3.json("departements-version-simplifiee.geojson").then((geo) => {
    const container = d3.select("#viz2-cards");
    container.selectAll("*").remove(); // Clear previous charts

    const n = names.length;

    // Determine grid size based on number of names
    let gridSize = 1;
    if (n <= 2) {
      gridSize = n;
    } else if (n >= 8) {
      gridSize = 4;
    } else {
      gridSize = Math.max(1, 2 * Math.floor(Math.log2(n - 1)));
    }

    const svgSize = 750 / gridSize; // Size of each individual map
    const legendHeight = 10;
    const legendWidth = svgSize * 0.6;

    names.forEach((name) => {
      // Filter data for the selected name
      const filtered = data.filter(
        (d) => d.preusuel && d.preusuel.toUpperCase() === name
      );

      // Aggregate counts by department
      const dptCounts = d3.rollup(
        filtered,
        (v) => d3.sum(v, (d) => d.nombre),
        (d) => d.dpt
      );

      // Define color scale based on value range
      const values = Array.from(dptCounts.values());
      const color = d3
        .scaleQuantize()
        .domain([d3.min(values) || 0, d3.max(values) || 1])
        .range(d3.schemeBlues[6]);

      // Create a container card for the map
      const card = container
        .append("div")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("background", "#fff")
        .style("box-shadow", "0 0 4px rgba(0,0,0,0.1)");

      // Create SVG element for the map
      const svg = card
        .append("svg")
        .attr("width", svgSize)
        .attr("height", svgSize + 40); // Extra space for title and legend

      // Set up geographic projection
      const projection = d3.geoConicConformal();
      const path = d3.geoPath().projection(projection);
      projection.fitSize([svgSize, svgSize], geo);

      // Draw departments with fill based on data values
      svg
        .selectAll("path")
        .data(geo.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", (d) => {
          const val = dptCounts.get(d.properties.code);
          return val ? color(val) : "#eee";
        })
        .attr("stroke", "#999")
        .append("title")
        .text((d) => {
          const val = dptCounts.get(d.properties.code) || 0;
          return `${d.properties.nom} (${d.properties.code}): ${val}`;
        });

      // Add map title (name)
      svg
        .append("text")
        .attr("x", svgSize / 2)
        .attr("y", svgSize - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(name);

      // Create unique gradient for each legend
      const defs = svg.append("defs");
      const linearGradient = defs
        .append("linearGradient")
        .attr("id", `legend-gradient-${name}`)
        .attr("x1", "0%")
        .attr("x2", "100%");

      // Define color stops in the gradient
      color.range().forEach((col, i, arr) => {
        linearGradient
          .append("stop")
          .attr("offset", `${(i / (arr.length - 1)) * 100}%`)
          .attr("stop-color", col);
      });

      // Create legend group
      const legendGroup = svg
        .append("g")
        .attr("transform", `translate(${(svgSize - legendWidth) / 2}, ${svgSize})`);

      // Draw legend bar
      legendGroup
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#legend-gradient-${name})`);

      // Add legend axis
      const legendScale = d3
        .scaleLinear()
        .domain(color.domain())
        .range([0, legendWidth]);

      const legendAxis = d3.axisBottom(legendScale).ticks(4).tickFormat(d3.format("d"));

      legendGroup
        .append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "10px");
    })
  })
}

document.getElementById("update-viz2").onclick = updateViz2;

// Enter key on input
document.getElementById("region-name-select").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    updateViz2();
  }
});


// Visualization 3: Gender Effects
function updateViz3() {
  if (!data.length) {
    alert("Please load the data first.");
    return;
  }

  const input = document.getElementById("gender-name-select").value;
  const names = input
    .split(",")
    .map((n) => n.trim().toUpperCase())
    .filter((n) => n);

  if (!names.length) {
    alert("Please enter at least one name.");
    return;
  }

  const container = d3.select("#viz3-cards");
  container.selectAll("*").remove(); // Clear previous charts

  const n = names.length;

  // Consistent grid sizing logic from viz2
  let gridSize = 1;
  if (n >= 2) {
    gridSize = 2;
  }

  const svgSize = 750 / gridSize;
  const margin = { top: 50, right: 80, bottom: 40, left: 60 };
  const width = svgSize - margin.left - margin.right;
  const height = svgSize - margin.top - margin.bottom;

  names.forEach((name) => {
    const filtered = data
      .filter((d) => d.preusuel && d.preusuel.toUpperCase() === name && d.annais !== "XXXX")
      .map((d) => ({
        year: +d.annais,
        sexe: d.sexe,
        nombre: +d.nombre,
      }));

    const binned = d3.groups(filtered, (d) => Math.floor(d.year / 10) * 10).map(([decade, records]) => {
      const totalByGender = d3.rollup(
        records,
        (v) => d3.sum(v, (d) => d.nombre),
        (d) => d.sexe
      );
      const total = d3.sum(records, (d) => d.nombre);
      return {
        decade,
        malePct: (totalByGender.get("1") || 0) / total,
        femalePct: (totalByGender.get("2") || 0) / total,
        total,
      }
    });

    binned.sort((a, b) => a.decade - b.decade);

    // Card wrapper
    const card = container
      .append("div")
      .style("border", "1px solid #ccc")
      .style("background", "#fff")
      .style("box-shadow", "0 0 4px rgba(0,0,0,0.1)")
      .style("display", "inline-block");

    const svg = card
      .append("svg")
      .attr("width", svgSize)
      .attr("height", svgSize)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3
      .scaleBand()
      .domain(binned.map((d) => d.decade))
      .range([0, height])
      .paddingInner(0.3)
      .paddingOuter(0.2);

    const x = d3.scaleLinear().domain([0, 1]).range([0, width]);

    const color = {
      male: "#1f77b4",
      female: "#e377c2",
    };

    svg
      .selectAll(".bar-male")
      .data(binned)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.decade))
      .attr("width", (d) => x(d.malePct))
      .attr("height", y.bandwidth())
      .attr("fill", color.male);

    svg
      .selectAll(".bar-female")
      .data(binned)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.malePct))
      .attr("y", (d) => y(d.decade))
      .attr("width", (d) => x(d.femalePct))
      .attr("height", y.bandwidth())
      .attr("fill", color.female);

    svg
      .selectAll(".total-label")
      .data(binned)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.malePct + d.femalePct) + 4)
      .attr("y", (d) => y(d.decade) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .text((d) => `Total: ${d3.format(",")(d.total)}`);

    svg.append("g").call(d3.axisLeft(y).tickFormat((d) => `${d}s`));

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format(".0%")));

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 30)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text("Percentage");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text("Decade");

    // Title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(name);

    // Legend (top-center)
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width / 2 - 50}, -5)`);

    const legendItems = legend
      .selectAll(".legend-item")
      .data([
        { label: "Male", color: color.male },
        { label: "Female", color: color.female },
      ])
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(${i * 80}, 0)`);

    legendItems
      .append("rect")
      .attr("x", 0)
      .attr("y", -10)
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", (d) => d.color);

    legendItems
      .append("text")
      .attr("x", 18)
      .attr("y", -4)
      .style("font-size", "10px")
      .text((d) => d.label);
  })
}



document.getElementById("update-viz3").onclick = updateViz3;

// Enter key on input
document.getElementById("gender-name-select").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    updateViz3();
  }
});