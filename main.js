// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 0, bottom: 100, left: 80 }

// Function to update the temperature chart for selected city
function updateTemperatureChart(selectedCity) {
    // Filter data for selected city
    const cityTempData = globalData.filter(d => d.city === selectedCity);
    
    // Remove initial message
    svg2.selectAll(".initial-message-temp").remove();
    
    // Update title
    svg2.select(".chart-title-temp")
        .text(`Daily Temperature Trends - ${selectedCity}`);

    // Update scales
    xScale2.domain(d3.extent(cityTempData, d => d.date));
    yScale2.domain(d3.extent(cityTempData, d => +d.actual_mean_temp)).nice();

    // Update axes
    svg2.select(".x-axis-temp")
        .transition()
        .duration(750)
        .call(d3.axisBottom(xScale2)
            .tickFormat(d3.timeFormat("%b %Y"))
            .ticks(d3.timeMonth.every(1)));

    svg2.select(".y-axis-temp")
        .transition()
        .duration(750)
        .call(d3.axisLeft(yScale2));

    // Line generator
    const line = d3.line()
        .x(d => xScale2(d.date))
        .y(d => yScale2(+d.actual_mean_temp))
        .curve(d3.curveMonotoneX);

    // Remove existing line and dots
    svg2.selectAll(".temp-line").remove();
    svg2.selectAll(".temp-dots").remove();
    svg2.selectAll(".temp-hover-area").remove();

    // Add the line
    svg2.append("path")
        .datum(cityTempData)
        .attr("class", "temp-line")
        .attr("fill", "none")
        .attr("stroke", colorScale(selectedCity))
        .attr("stroke-width", 2)
        .attr("d", line)
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 0.8);

    // Add dots for data points (all data points, not sampled)
    svg2.selectAll(".temp-dots")
        .data(cityTempData)
        .enter()
        .append("circle")
        .attr("class", "temp-dots")
        .attr("cx", d => xScale2(d.date))
        .attr("cy", d => yScale2(+d.actual_mean_temp))
        .attr("r", 0)
        .attr("fill", colorScale(selectedCity))
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 2)
        .attr("r", 2)
        .style("opacity", 0.6);

    // Add invisible larger circles for easier hover interaction
    svg2.selectAll(".temp-hover-area")
        .data(cityTempData)
        .enter()
        .append("circle")
        .attr("class", "temp-hover-area")
        .attr("cx", d => xScale2(d.date))
        .attr("cy", d => yScale2(+d.actual_mean_temp))
        .attr("r", 6)
        .attr("fill", "transparent")
        .style("cursor", "pointer");

    // Add interactivity to hover areas (easier to target)
    svg2.selectAll(".temp-hover-area")
        .on("mouseover", function(event, d) {
            // Find and highlight the corresponding visible dot
            const correspondingDot = svg2.selectAll(".temp-dots")
                .filter(dotData => dotData.date.getTime() === d.date.getTime());
            
            correspondingDot
                .transition()
                .duration(100)
                .attr("r", 4)
                .style("opacity", 1);

            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.city}</strong><br/>
                Date: ${d3.timeFormat("%B %d, %Y")(d.date)}<br/>
                Mean Temperature: ${d.actual_mean_temp}°F<br/>
                Min: ${d.actual_min_temp}°F / Max: ${d.actual_max_temp}°F
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            // Reset the corresponding visible dot
            const correspondingDot = svg2.selectAll(".temp-dots")
                .filter(dotData => dotData.date.getTime() === d.date.getTime());
            
            correspondingDot
                .transition()
                .duration(100)
                .attr("r", 2)
                .style("opacity", 0.6);

            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
};
const width = 1100 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create SVG container for the rainfall chart
const svg1 = d3.select("#lineChart1")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create SVG container for the temperature chart
const svg2 = d3.select("#lineChart2")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip element for interactivity
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none");

// Global variables for data
let globalData = [];
let monthlyData = [];
let cities = [];

// Color scale
const colorScale = d3.scaleOrdinal()
    .range(['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949']);

// 2.a: LOAD AND TRANSFORM DATA
d3.csv("weather.csv").then(data => {
    console.log("Raw data:", data);
    
    // 2.b: TRANSFORM DATA
    // Parse dates and convert precipitation to numbers
    data.forEach(d => {
        d.date = new Date(d.date);
        d.actual_precipitation = +d.actual_precipitation;
        d.month = d.date.getMonth(); // 0-11
        d.year = d.date.getFullYear();
        d.monthYear = `${d.year}-${String(d.month + 1).padStart(2, '0')}`;
    });

    globalData = data;
    cities = [...new Set(data.map(d => d.city))];
    
    // Populate city selector
    const citySelect = d3.select("#citySelect");
    citySelect.selectAll("option.city-option")
        .data(cities)
        .enter()
        .append("option")
        .attr("class", "city-option")
        .attr("value", d => d)
        .text(d => d);

    // Process monthly data for all cities
    cities.forEach(city => {
        const cityData = data.filter(d => d.city === city);
        const monthlyTotals = {};
        
        // Calculate monthly totals
        cityData.forEach(d => {
            if (!monthlyTotals[d.monthYear]) {
                monthlyTotals[d.monthYear] = 0;
            }
            monthlyTotals[d.monthYear] += d.actual_precipitation;
        });
        
        // Convert to array and sort by date
        const cityMonthly = Object.entries(monthlyTotals)
            .map(([monthYear, total]) => ({
                city: city,
                monthYear: monthYear,
                date: new Date(monthYear + "-01"),
                monthlyRainfall: total
            }))
            .sort((a, b) => a.date - b.date);
        
        monthlyData.push(...cityMonthly);
    });

    console.log("Processed data:", monthlyData);

    // Set up scales (initially empty)
    setupScales();
    
    // Add axes containers
    setupAxes();
    
    // Add labels
    addLabels();
    
    // Set event listener for city selection
    citySelect.on("change", function() {
        const selectedCity = this.value;
        if (selectedCity) {
            updateChart(selectedCity);
            updateTemperatureChart(selectedCity);
        } else {
            clearChart();
            clearTemperatureChart();
        }
    });

    // Initial message
    showInitialMessage();
});

// Function to set up scales
function setupScales() {
    // Rainfall chart scales
    window.xScale = d3.scaleBand()
        .range([0, width])
        .padding(0.05);

    window.yScale = d3.scaleLinear()
        .range([height, 0]);
    
    // Temperature chart scales
    window.xScale2 = d3.scaleTime()
        .range([0, width]);

    window.yScale2 = d3.scaleLinear()
        .range([height, 0]);
}

// Function to set up axes containers
function setupAxes() {
    // Rainfall chart axes
    svg1.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`);

    svg1.append("g")
        .attr("class", "y-axis");
    
    // Temperature chart axes
    svg2.append("g")
        .attr("class", "x-axis-temp")
        .attr("transform", `translate(0, ${height})`);

    svg2.append("g")
        .attr("class", "y-axis-temp");
}

// Function to add labels
function addLabels() {
    // Rainfall chart labels
    svg1.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2 - 100)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Monthly Rainfall by City");

    svg1.append("text")
        .attr("class", "x-label")
        .attr("x", width / 2 - 100)
        .attr("y", height + 70)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Month");

    svg1.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Monthly Rainfall (inches)");
    
    // Temperature chart labels
    svg2.append("text")
        .attr("class", "chart-title-temp")
        .attr("x", width / 2 - 100)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Daily Temperature Trends");

    svg2.append("text")
        .attr("class", "x-label-temp")
        .attr("x", width / 2 - 100)
        .attr("y", height + 70)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Date");

    svg2.append("text")
        .attr("class", "y-label-temp")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Temperature (°F)");
}

// Function to show initial message
function showInitialMessage() {
    svg1.append("text")
        .attr("class", "initial-message")
        .attr("x", width / 2 - 100)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text("Please select a city to view rainfall data");
    
    svg2.append("text")
        .attr("class", "initial-message-temp")
        .attr("x", width / 2 - 100)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text("Please select a city to view temperature data");
}

// Function to clear the charts
function clearChart() {
    svg1.selectAll(".bar").remove();
    svg1.selectAll(".initial-message").remove();
    
    // Update title
    svg1.select(".chart-title")
        .text("Monthly Rainfall by City");
    
    svg1.append("text")
        .attr("class", "initial-message")
        .attr("x", width / 2 - 100)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text("Please select a city to view rainfall data");
}

function clearTemperatureChart() {
    svg2.selectAll(".temp-line").remove();
    svg2.selectAll(".temp-dots").remove();
    svg2.selectAll(".temp-hover-area").remove();
    svg2.selectAll(".initial-message-temp").remove();
    
    // Update title
    svg2.select(".chart-title-temp")
        .text("Daily Temperature Trends");
    
    svg2.append("text")
        .attr("class", "initial-message-temp")
        .attr("x", width / 2 - 100)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text("Please select a city to view temperature data");
}

// Function to update the chart for selected city
function updateChart(selectedCity) {
    // Filter data for selected city
    const cityData = monthlyData.filter(d => d.city === selectedCity);
    
    // Remove initial message
    svg1.selectAll(".initial-message").remove();
    
    // Update title
    svg1.select(".chart-title")
        .text(`Monthly Rainfall - ${selectedCity}`);

    // Update scales
    xScale.domain(cityData.map(d => d3.timeFormat("%Y-%m")(d.date)));
    yScale.domain([0, d3.max(cityData, d => d.monthlyRainfall)]).nice();

    // Update axes
    svg1.select(".x-axis")
        .transition()
        .duration(750)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    svg1.select(".y-axis")
        .transition()
        .duration(750)
        .call(d3.axisLeft(yScale));

    // Bind data to bars
    const bars = svg1.selectAll(".bar")
        .data(cityData, d => d.monthYear);

    // Remove old bars
    bars.exit()
        .transition()
        .duration(500)
        .attr("height", 0)
        .attr("y", height)
        .remove();

    // Add new bars
    const newBars = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d3.timeFormat("%Y-%m")(d.date)))
        .attr("y", height)
        .attr("width", xScale.bandwidth())
        .attr("height", 0)
        .attr("fill", colorScale(selectedCity))
        .style("opacity", 0.8);

    // Update all bars
    bars.merge(newBars)
        .transition()
        .duration(750)
        .attr("x", d => xScale(d3.timeFormat("%Y-%m")(d.date)))
        .attr("y", d => yScale(d.monthlyRainfall))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.monthlyRainfall))
        .attr("fill", colorScale(selectedCity));

    // Add interactivity to bars
    svg1.selectAll(".bar")
        .on("mouseover", function(event, d) {
            // Highlight the bar
            d3.select(this)
                .transition()
                .duration(100)
                .style("opacity", 1)
                .attr("stroke", "#333")
                .attr("stroke-width", 2);

            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.city}</strong><br/>
                Month: ${d3.timeFormat("%B %Y")(d.date)}<br/>
                Rainfall: ${d.monthlyRainfall.toFixed(2)} inches
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            // Reset the bar
            d3.select(this)
                .transition()
                .duration(100)
                .style("opacity", 0.8)
                .attr("stroke", "none");

            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

// Add some basic styling
const style = document.createElement('style');
style.textContent = `
    .tooltip {
        pointer-events: none;
        z-index: 1000;
    }
    
    .bar {
        cursor: pointer;
    }
    
    #citySelect {
        padding: 8px 12px;
        border: 2px solid #ccc;
        border-radius: 4px;
        background-color: white;
        font-size: 14px;
        margin-left: 10px;
        min-width: 150px;
    }
    
    #citySelect:focus {
        outline: none;
        border-color: #4e79a7;
    }
    
    .item {
        margin: 20px 0;
    }
    
    .horizontal-container {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .x-axis text {
        fill: #333;
    }
    
    .y-axis text {
        fill: #333;
    }
    
    .axis path,
    .axis line {
        fill: none;
        stroke: #333;
        shape-rendering: crispEdges;
    }
    
    .temp-line {
        fill: none;
        stroke-width: 2px;
    }
    
    .temp-dots {
        cursor: pointer;
    }
    
    .x-axis-temp text {
        transform: rotate(-45deg);
        text-anchor: end;
    }
`;
document.head.appendChild(style);