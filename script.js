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
document.getElementById("update-viz1").onclick = function () {
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
  const margin = { top: 30, right: 80, bottom: 40, left: 50 };
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
};

// Visualization 2: Regional Popularity (Choropleth Map)
document.getElementById("update-viz2").onclick = function () {
  // Parse input, filter data, and draw map for selected name
  if (!data.length) {
    alert("Please load the data first.");
    return;
  }
  const input = document.getElementById("region-name-select").value;
  const name = input.trim().toUpperCase();
  if (!name) {
    alert("Please enter a name.");
    return;
  }

  // Filter data for the selected name
  const filtered = data.filter(
    (d) => d.preusuel && d.preusuel.toUpperCase() === name
  );

  // Group by department, sum counts
  const dptCounts = d3.rollup(
    filtered,
    (v) => d3.sum(v, (d) => d.nombre),
    (d) => d.dpt
  );

  // Load GeoJSON for French departments
  d3.json("departements-version-simplifiee.geojson").then((geo) => {
    // Prepare color scale
    const values = Array.from(dptCounts.values());
    const color = d3
      .scaleQuantize()
      .domain([d3.min(values) || 0, d3.max(values) || 1])
      .range(d3.schemeBlues[6]);

    // Set up SVG
    const width = 750,
      height = 750;
    const svg = d3
      .select("#viz2-svg")
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();
    const projection = d3.geoConicConformal();
    const path = d3.geoPath().projection(projection);

    // Fit the projection to the SVG size and geo data
    projection.fitSize([width, height], geo);
    // Draw map
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

    // Add legend
    const legendWidth = 200,
      legendHeight = 10;
    const legendSvg = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - legendWidth - 30},${height - 40})`
      );

    const legendScale = d3
      .scaleLinear()
      .domain(color.domain())
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(6)
      .tickFormat(d3.format("d"));

    // Gradient for legend
    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient");
    color.range().forEach((col, i, arr) => {
      linearGradient
        .append("stop")
        .attr("offset", `${(i / (arr.length - 1)) * 100}%`)
        .attr("stop-color", col);
    });

    legendSvg
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    legendSvg
      .append("g")
      .attr("transform", `translate(0,${legendHeight})`)
      .call(legendAxis);

    // Title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .text(`Regional Popularity of "${name}"`);
  });
};

// Visualization 3: Gender Effects (Dual Line Chart)
document.getElementById("update-viz3").onclick = function () {
  // TODO: Parse input, filter data, and draw dual line chart for gender trends
  if (!data.length) {
    alert("Please load the data first.");
    return;
  }
  const input = document.getElementById("gender-name-select").value;
  const name = input.trim().toUpperCase();
  if (!name) {
    alert("Please enter a name.");
    return;
  }

  // Filter data for the selected name
  const filtered = data.filter(
    (d) => d.preusuel && d.preusuel.toUpperCase() === name
  );

  // Group by year and gender, sum counts
  const nested = d3.groups(
    filtered,
    (d) => d.sexe,
    (d) => d.annais
  ).map(([sexe, years]) => ({
    sexe,
    values: years
      .map(([year, records]) => ({
        year: +year,
        count: d3.sum(records, (r) => r.nombre),
      }))
      .sort((a, b) => a.year - b.year),
  }));

  // Set up SVG
  const margin = { top: 30, right: 80, bottom: 40, left: 50 };
  const width = 700 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  d3.select("#viz3-svg").selectAll("*").remove();

  const svg = d3
    .select("#viz3-svg")
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
    .domain([
      0,
      d3.max(nested, (d) => d3.max(d.values, (v) => v.count)) || 1,
    ])
    .nice()
    .range([height, 0]);

  // Axes
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").call(d3.axisLeft(y));

  // Color scale for gender
  const genderLabels = { "1": "Male", "2": "Female" };
  const color = d3
    .scaleOrdinal()
    .domain(["1", "2"])
    .range(["#1f77b4", "#e377c2"]);

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
      .attr("stroke", color(d.sexe))
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add gender labels at the end of each line
    const last = d.values[d.values.length - 1];
    if (last) {
      svg
        .append("text")
        .attr("x", x(last.year) + 5)
        .attr("y", y(last.count))
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", color(d.sexe))
        .text(genderLabels[d.sexe] || d.sexe);
    }
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

  // Legend
  const legend = svg
    .selectAll(".legend")
    .data(["1", "2"])
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => `translate(0,${i * 20})`);

  legend
    .append("rect")
    .attr("x", width + 10)
    .attr("width", 14)
    .attr("height", 14)
    .style("fill", color);

  legend
    .append("text")
    .attr("x", width + 30)
    .attr("y", 7)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text((d) => genderLabels[d] || d);
};
