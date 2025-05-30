// ==============================================
// WEATHER DASHBOARD - IMPROVED MAIN.JS
// ==============================================

// 1: GLOBAL VARIABLES AND CONFIGURATION
const margin = { top: 60, right: 85, bottom: 120, left: 80 };
const width = 1000 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

// Global data variables
let globalData = [];
let monthlyData = [];
let cities = [];
let currentSelectedCity = null;

// Color scale for consistent styling
const colorScale = d3.scaleOrdinal()
    .range(['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949']);

// ==============================================
// 2: SVG SETUP AND INITIALIZATION
// ==============================================

// Create SVG containers with proper centering
const svg1 = d3.select("#lineChart1")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const svg2 = d3.select("#lineChart2")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tooltip with improved styling
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.9)")
    .style("color", "white")
    .style("padding", "12px 16px")
    .style("border-radius", "8px")
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
    .style("line-height", "1.4");

// ==============================================
// 3: SCALES SETUP
// ==============================================

// Rainfall chart scales
const xScale = d3.scaleBand()
    .range([0, width])
    .padding(0.1);

const yScale = d3.scaleLinear()
    .range([height, 0]);

// Temperature chart scales
const xScale2 = d3.scaleTime()
    .range([0, width]);

const yScale2 = d3.scaleLinear()
    .range([height, 0]);

// ==============================================
// 4: DATA LOADING AND PROCESSING
// ==============================================

// Load and process data
d3.csv("weather.csv").then(data => {
    console.log("Raw data loaded:", data.length, "records");
    
    // Parse and transform data
    data.forEach(d => {
        d.date = new Date(d.date);
        d.actual_precipitation = +d.actual_precipitation;
        d.actual_mean_temp = +d.actual_mean_temp;
        d.actual_min_temp = +d.actual_min_temp;
        d.actual_max_temp = +d.actual_max_temp;
        d.month = d.date.getMonth();
        d.year = d.date.getFullYear();
        d.monthYear = `${d.year}-${String(d.month + 1).padStart(2, '0')}`;
    });

    globalData = data;
    cities = [...new Set(data.map(d => d.city))].sort();
    
    console.log("Cities found:", cities);
    
    // Initialize UI components
    setupCitySelector();
    processMonthlyData();
    setupCharts();
    showInitialMessages();
    
}).catch(error => {
    console.error("Error loading data:", error);
    // Fallback to sample data if CSV fails to load
    generateSampleData();
});

// Fallback sample data generator
function generateSampleData() {
    console.log("Using sample data");
    
    const sampleCities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
    const data = [];
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2024-12-31');
    
    sampleCities.forEach(city => {
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            // Generate realistic weather patterns
            let baseTemp, basePrecip;
            switch(city) {
                case 'New York': baseTemp = 55; basePrecip = 0.1; break;
                case 'Los Angeles': baseTemp = 70; basePrecip = 0.05; break;
                case 'Chicago': baseTemp = 50; basePrecip = 0.08; break;
                case 'Houston': baseTemp = 75; basePrecip = 0.12; break;
                case 'Phoenix': baseTemp = 80; basePrecip = 0.03; break;
                default: baseTemp = 60; basePrecip = 0.08;
            }
            
            // Add seasonal variation
            const dayOfYear = Math.floor((currentDate - new Date(currentDate.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const seasonalTemp = baseTemp + 20 * Math.sin((dayOfYear / 365) * 2 * Math.PI - Math.PI/2);
            const seasonalPrecip = basePrecip * (1 + 0.5 * Math.sin((dayOfYear / 365) * 2 * Math.PI));
            
            // Add random variation
            const temp = seasonalTemp + (Math.random() - 0.5) * 20;
            const precipitation = Math.max(0, seasonalPrecip + (Math.random() - 0.7) * 0.5);
            
            data.push({
                city: city,
                date: new Date(currentDate),
                actual_mean_temp: Math.round(temp),
                actual_min_temp: Math.round(temp - 5 - Math.random() * 10),
                actual_max_temp: Math.round(temp + 5 + Math.random() * 10),
                actual_precipitation: Math.round(precipitation * 100) / 100,
                month: currentDate.getMonth(),
                year: currentDate.getFullYear(),
                monthYear: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });
    
    globalData = data;
    cities = sampleCities;
    
    setupCitySelector();
    processMonthlyData();
    setupCharts();
    showInitialMessages();
}

// ==============================================
// 5: UI COMPONENT SETUP
// ==============================================

function setupCitySelector() {
    const citySelect = d3.select("#citySelect");
    
    // Clear existing options except the first one
    citySelect.selectAll("option.city-option").remove();
    
    // Add city options
    citySelect.selectAll("option.city-option")
        .data(cities)
        .enter()
        .append("option")
        .attr("class", "city-option")
        .attr("value", d => d)
        .text(d => d);

    // Set up event listener with synchronized updates
    citySelect.on("change", function() {
        const selectedCity = this.value;
        if (selectedCity && selectedCity !== currentSelectedCity) {
            currentSelectedCity = selectedCity;
            updateBothCharts(selectedCity);
            updateLegend(selectedCity);
        } else if (!selectedCity) {
            currentSelectedCity = null;
            clearBothCharts();
            hideLegend();
        }
    });
}

function processMonthlyData() {
    monthlyData = [];
    
    cities.forEach(city => {
        const cityData = globalData.filter(d => d.city === city);
        const monthlyTotals = {};
        
        // Calculate monthly rainfall totals
        cityData.forEach(d => {
            if (!monthlyTotals[d.monthYear]) {
                monthlyTotals[d.monthYear] = 0;
            }
            monthlyTotals[d.monthYear] += d.actual_precipitation;
        });
        
        // Convert to array format
        const cityMonthly = Object.entries(monthlyTotals)
            .map(([monthYear, total]) => ({
                city: city,
                monthYear: monthYear,
                date: new Date(monthYear + "-01"),
                monthlyRainfall: Math.round(total * 100) / 100
            }))
            .sort((a, b) => a.date - b.date);
        
        monthlyData.push(...cityMonthly);
    });
    
    console.log("Monthly data processed:", monthlyData.length, "records");
}

// ==============================================
// 6: CHART SETUP AND INITIALIZATION
// ==============================================

function setupCharts() {
    setupRainfallChart();
    setupTemperatureChart();
}

function setupRainfallChart() {
    // Add axes containers
    svg1.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`);

    svg1.append("g")
        .attr("class", "y-axis");
    
    // Add chart title
    svg1.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "#2c3e50")

    // Add axis labels
    svg1.append("text")
        .attr("class", "x-label")
        .attr("x", width / 2)
        .attr("y", height + 80)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#495057")
        .text("Month");

    svg1.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#495057")
        .text("Monthly Rainfall (inches)");
}

function setupTemperatureChart() {
    // Add axes containers
    svg2.append("g")
        .attr("class", "x-axis-temp")
        .attr("transform", `translate(0, ${height})`);

    svg2.append("g")
        .attr("class", "y-axis-temp");
    
    // Add chart title
    svg2.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "#2c3e50")

    // Add axis labels
    svg2.append("text")
        .attr("class", "x-label-temp")
        .attr("x", width / 2)
        .attr("y", height + 80)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#495057")
        .text("Date");

    svg2.append("text")
        .attr("class", "y-label-temp")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#495057")
        .text("Temperature (°F)");
}

function showInitialMessages() {
    svg1.append("text")
        .attr("class", "initial-message")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#6c757d")
        .style("font-style", "italic")
        .text("Please select a city to view rainfall data");
    
    svg2.append("text")
        .attr("class", "initial-message-temp")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#6c757d")
        .style("font-style", "italic")
        .text("Please select a city to view temperature data");
}

// ==============================================
// 7: CHART UPDATE FUNCTIONS (SYNCHRONIZED)
// ==============================================

function updateBothCharts(selectedCity) {
    // Update both charts simultaneously for consistency
    updateRainfallChart(selectedCity);
    updateTemperatureChart(selectedCity);
    console.log("Updated both charts for:", selectedCity);
}

function updateRainfallChart(selectedCity) {
    const cityData = monthlyData.filter(d => d.city === selectedCity);
    
    if (!cityData || cityData.length === 0) {
        console.warn("No rainfall data found for:", selectedCity);
        return;
    }
    
    // Remove initial message
    svg1.selectAll(".initial-message").remove();
    
    // Update scales
    xScale.domain(cityData.map(d => d3.timeFormat("%Y-%m")(d.date)));
    yScale.domain([0, d3.max(cityData, d => d.monthlyRainfall)]).nice();

    // Update axes with smooth transitions
    svg1.select(".x-axis")
        .transition()
        .duration(750)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)")
        .style("fill", "#495057");

    svg1.select(".y-axis")
        .transition()
        .duration(750)
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("fill", "#495057");

    // Data binding with key function for smooth transitions
    const bars = svg1.selectAll(".bar")
        .data(cityData, d => d.monthYear);

    // Remove old bars
    bars.exit()
        .transition()
        .duration(500)
        .attr("height", 0)
        .attr("y", height)
        .style("opacity", 0)
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
        .style("opacity", 0.8)
        .style("cursor", "pointer");

    // Update all bars with smooth animation
    bars.merge(newBars)
        .transition()
        .duration(750)
        .attr("x", d => xScale(d3.timeFormat("%Y-%m")(d.date)))
        .attr("y", d => yScale(d.monthlyRainfall))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.monthlyRainfall))
        .attr("fill", colorScale(selectedCity));

    // Add enhanced interactivity
    svg1.selectAll(".bar")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(100)
                .style("opacity", 1)
                .attr("stroke", "#333")
                .attr("stroke-width", 2);

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
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(100)
                .style("opacity", 0.8)
                .attr("stroke", "none");

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function updateTemperatureChart(selectedCity) {
    const cityTempData = globalData.filter(d => d.city === selectedCity);
    
    if (!cityTempData || cityTempData.length === 0) {
        console.warn("No temperature data found for:", selectedCity);
        return;
    }
    
    // Remove initial message
    svg2.selectAll(".initial-message-temp").remove();
    

    // Update scales
    xScale2.domain(d3.extent(cityTempData, d => d.date));
    yScale2.domain(d3.extent(cityTempData, d => d.actual_mean_temp)).nice();

    // Update axes - Modified to use consistent numeric format for months
    svg2.select(".x-axis-temp")
        .transition()
        .duration(750)
        .call(d3.axisBottom(xScale2)
            .tickFormat(d3.timeFormat("%Y-%m"))  // Changed from "%b %Y" to "%Y-%m" for consistency
            .ticks(d3.timeMonth.every(2)))
        .selectAll("text")
        .style("text-anchor", "middle")  // Changed from "end" to "middle"
        .attr("dx", "0")  // Changed from "-.8em" to "0"
        .attr("dy", ".8em")  // Changed from ".15em" to ".8em"
        .attr("transform", "rotate(0)")  // Changed from "rotate(-45)" to "rotate(0)"
        .style("fill", "#495057");

    svg2.select(".y-axis-temp")
        .transition()
        .duration(750)
        .call(d3.axisLeft(yScale2))
        .selectAll("text")
        .style("fill", "#495057");

    // Line generator
    const line = d3.line()
        .x(d => xScale2(d.date))
        .y(d => yScale2(d.actual_mean_temp))
        .curve(d3.curveMonotoneX);

    // Remove existing elements
    svg2.selectAll(".temp-line").remove();
    svg2.selectAll(".temp-dots").remove();
    svg2.selectAll(".temp-hover-area").remove();

    // Use ALL original data points to preserve trends (no sampling)
    const fullData = cityTempData;

    // Add the line with smooth animation using all data points
    svg2.append("path")
        .datum(fullData)
        .attr("class", "temp-line")
        .attr("fill", "none")
        .attr("stroke", colorScale(selectedCity))
        .attr("stroke-width", 2)
        .attr("d", line)
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 0.8);

    // Add dots for all data points to preserve original detail
    svg2.selectAll(".temp-dots")
        .data(fullData)
        .enter()
        .append("circle")
        .attr("class", "temp-dots")
        .attr("cx", d => xScale2(d.date))
        .attr("cy", d => yScale2(d.actual_mean_temp))
        .attr("r", 0)
        .attr("fill", colorScale(selectedCity))
        .style("opacity", 0)
        .style("cursor", "pointer")
        .transition()
        .duration(1000)
        .delay((d, i) => i * 2)
        .attr("r", 2)
        .style("opacity", 0.6);

    // Add invisible hover areas for better interaction (all data points)
    svg2.selectAll(".temp-hover-area")
        .data(fullData)
        .enter()
        .append("circle")
        .attr("class", "temp-hover-area")
        .attr("cx", d => xScale2(d.date))
        .attr("cy", d => yScale2(d.actual_mean_temp))
        .attr("r", 6)
        .attr("fill", "transparent")
        .style("cursor", "pointer");

    // Enhanced interactivity for all data points
    svg2.selectAll(".temp-hover-area")
        .on("mouseover", function(event, d) {
            const correspondingDot = svg2.selectAll(".temp-dots")
                .filter(dotData => dotData.date.getTime() === d.date.getTime());
            
            correspondingDot
                .transition()
                .duration(100)
                .attr("r", 4)
                .style("opacity", 1);

            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`
                <strong>${d.city}</strong><br/>
                Date: ${d3.timeFormat("%B %d, %Y")(d.date)}<br/>
                Mean Temperature: ${d.actual_mean_temp}°F<br/>
                Range: ${d.actual_min_temp}°F - ${d.actual_max_temp}°F
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            const correspondingDot = svg2.selectAll(".temp-dots")
                .filter(dotData => dotData.date.getTime() === d.date.getTime());
            
            correspondingDot
                .transition()
                .duration(100)
                .attr("r", 2)
                .style("opacity", 0.6);

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

// ==============================================
// 8: LEGEND MANAGEMENT
// ==============================================

function updateLegend(selectedCity) {
    // Create or update legend
    let legend = d3.select("#legend");
    
    if (legend.empty()) {
        // Create legend if it doesn't exist
        legend = d3.select("body")
            .append("div")
            .attr("id", "legend")
            .style("position", "fixed")
            .style("top", "20px")
            .style("right", "20px")
            .style("background", "white")
            .style("padding", "15px 20px")
            .style("border-radius", "8px")
            .style("border", "1px solid #e9ecef")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
            .style("z-index", "1000");
        
        legend.append("div")
            .attr("class", "legend-title")
            .style("font-weight", "bold")
            .style("margin-bottom", "8px")
            .style("color", "#2c3e50")
            .text("Current Selection:");
        
        const legendItem = legend.append("div")
            .attr("class", "legend-item")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "8px");
        
        legendItem.append("div")
            .attr("class", "legend-color")
            .style("width", "16px")
            .style("height", "16px")
            .style("border-radius", "3px");
        
        legendItem.append("span")
            .attr("class", "legend-text")
            .style("font-size", "14px")
            .style("color", "#2c3e50");
    }
    
    // Update legend content
    legend.select(".legend-color")
        .style("background-color", colorScale(selectedCity));
    
    legend.select(".legend-text")
        .text(selectedCity);
    
    legend.style("display", "block");
}

function hideLegend() {
    d3.select("#legend").style("display", "none");
}

// ==============================================
// 9: CLEAR FUNCTIONS
// ==============================================

function clearBothCharts() {
    clearRainfallChart();
    clearTemperatureChart();
    console.log("Cleared both charts");
}

function clearRainfallChart() {
    svg1.selectAll(".bar").remove();
    svg1.selectAll(".initial-message").remove();
    
    svg1.append("text")
        .attr("class", "initial-message")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#6c757d")
        .style("font-style", "italic")
        .text("Please select a city to view rainfall data");
}

function clearTemperatureChart() {
    svg2.selectAll(".temp-line").remove();
    svg2.selectAll(".temp-dots").remove();
    svg2.selectAll(".temp-hover-area").remove();
    svg2.selectAll(".initial-message-temp").remove();
    
    
    svg2.append("text")
        .attr("class", "initial-message-temp")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#6c757d")
        .style("font-style", "italic")
        .text("Please select a city to view temperature data");
}

// ==============================================
// 10: UTILITY FUNCTIONS AND ERROR HANDLING
// ==============================================

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error handling wrapper
function safeExecute(fn, errorMessage) {
    try {
        return fn();
    } catch (error) {
        console.error(errorMessage, error);
        return null;
    }
}

// Responsive resize handler
function handleResize() {
    // Add responsive behavior if needed
    const containerWidth = d3.select("#dashboard-container").node().getBoundingClientRect().width;
    if (containerWidth < 768) {
        // Mobile adjustments
        console.log("Mobile view detected");
    }
}

// Initialize resize listener
window.addEventListener('resize', debounce(handleResize, 250));

// ==============================================
// 11: ACCESSIBILITY AND STYLING ENHANCEMENTS
// ==============================================

// Add custom styles programmatically
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Enhanced tooltip styling */
        .tooltip {
            pointer-events: none;
            z-index: 1000;
            max-width: 200px;
        }
        
        /* Interactive elements */
        .bar:hover, .temp-dots:hover {
            filter: brightness(1.1);
        }
        
        /* City selector improvements */
        #citySelect {
            transition: all 0.3s ease;
        }
        
        #citySelect:hover {
            border-color: #4e79a7;
        }
        
        /* Axis styling */
        .axis text {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .axis path,
        .axis line {
            fill: none;
            stroke: #adb5bd;
            shape-rendering: crispEdges;
        }
        
        /* Chart titles */
        .chart-title {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        /* Temperature line styling */
        .temp-line {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .tooltip {
                font-size: 11px;
                padding: 8px 12px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize custom styles
addCustomStyles();

// ==============================================
// 12: INITIALIZATION AND FINAL SETUP
// ==============================================

console.log("Weather Dashboard initialized successfully");
console.log("Available cities will be loaded after data processing");

// Export functions for external access if needed
window.WeatherDashboard = {
    updateBothCharts,
    clearBothCharts,
    getCurrentCity: () => currentSelectedCity,
    getCities: () => cities,
    getData: () => globalData
};