// placeholder of histogram chart


var width = document.getElementById("canvas").getBoundingClientRect().width;
    height = document.getElementById("canvas").getBoundingClientRect().height;
    radius = 6,
    fill = "rgba(255, 49, 255, 1)",
    stroke = "rgba(0, 0, 0, 0.5)",
    strokeWidth = 0,

    pi = Math.PI,
    tau = 2 * Math.PI;

var distance_domain = [500, 1000, 1500, 2000, 2500],
    color_domain = ["#1D447A", "#75ACD4", "#C0D9EB", "#F1C1B2", "#BA3E30", "#932200"],
    distance_domain_legend = [0,500, 1000, 1500, 2000, 2500],
    nondatacolor = "#7b868e",
    color = d3.scaleThreshold().domain(distance_domain).range(color_domain);

// button of click to point office location
var selectWorkLoc = false;
document.getElementById('selectPt').onclick = function(){
  selectWorkLoc = true; console.log(selectWorkLoc);
  d3.selectAll('#workloc').remove();
};


// map generate from here

// define projection to NY
var projection = d3.geoAlbers()
    .scale( 1 << 17 )
    .rotate( [73.977,0] )
    .center( [0, 40.753] )
    .translate( [width/2,height/2] );

var path = d3.geoPath()
    .projection( projection );

var zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .on("zoom", zoomed);

// make a svg to hold the map
var svg = d3.select("#canvas")
var vector = svg.append("g").attr("id","vector");

// import data
d3.queue()
    .defer(d3.json, "data/nynj.json")
    .defer(d3.csv, "data/Rent_2017_5yr_NYNJ.csv")
    .await(ready);


// make a legend in Q1
legendFn();



// start construct an array of objects that includes geoid, centerCoord_long, centerCoord_lat, distance_to_center, median_rent
var distanceRent = {}; 
var distanceRentList =[];

// map generate from here
function ready(error, us, rent) {
  if (error) throw error;

  // create a dictionary mapping GEOID: Median Gross Rent

  var rentByGeoid = {}; // Create empty object for holding dataset
  rent.forEach(function(d) {
    if ( isNaN(d['Median Gross Rent'])  ) {
        d['Median Gross Rent'] = 0;
    }
    var geoid = parseFloat(d['Geographic Identifier'].substr(7,));
    if (geoid>0){
      rentByGeoid[geoid] = parseFloat(d['Median Gross Rent']);
      distanceRent[geoid] = {"geoid":geoid, "median_rent" : parseFloat(d['Median Gross Rent']), "centerCoord_long": 0 ,"centerCoord_lat": 0 ,"distance_to_center":0};
    }
    });


  // get features from map
  var features = topojson.feature(us, us.objects.NYNJ_merge).features;

  vector.attr("class", "blkgroup")
    .selectAll("path")
      .data(features)
    .enter().append("path")
      .attr("class", "blk")
      .attr("d", path)
      .filter(function(d) { 

        return d.geometry != null })
      .attr("centerCoord_long", function(d) {
        l = transpose(d.geometry.coordinates[0]); 
        distanceRent[parseFloat(d.properties.GEOID)]["centerCoord_long"] = math.mean(l[0]);
        return math.mean(l[0])
      })
      .attr("centerCoord_lat", function(d) {
        l = transpose(d.geometry.coordinates[0]); 
        distanceRent[parseFloat(d.properties.GEOID)]["centerCoord_lat"] = math.mean(l[1]);
        return math.mean(l[1])
      })
      .text(function(d) { return d; })
      .on("click", clicked)
      .on('click', function(d) {
        if (selectWorkLoc==true) {

          // get the center of the shape
          var t = path.centroid(d)
          t = [Math.round(t[0]),Math.round(t[1])]


          svg.selectAll(".centroid.pulse").data([t])
            .enter()
              .append('svg:image')
              .attr("class", "centroid pulse")
              .attr("id", "workloc")
              .attr("xlink:href", 'image/dot1.png')
              .attr("x", function (t){ return t[0]; })
              .attr("y", function (t){ return t[1]; })
              .attr("width", 50)
              .attr("height", 50);

          selectWorkLoc=false;

          var centroidCoord = [d3.select(this).attr("centerCoord_long"),d3.select(this).attr("centerCoord_lat")];

          // calculate the distance between this point and others

          d3.selectAll(".blk").each(function(d,i){
              var elt = d3.select(this);
              // console.log( elt.attr("centerCoord_long") - centroidCoord[0]);
              p1 = [elt.attr("centerCoord_long"),elt.attr("centerCoord_lat")];
              p2 = centroidCoord;
              distanceRent[parseFloat(d.properties.GEOID)]["distance_to_center"] = getDistance(p1,p2);
              elt.attr("distance",getDistance(p1,p2));
          });

          distanceRentList = Object.keys(distanceRent).map(function(key){return distanceRent[key];});


          // hide the temp "before_plot" class
          d3.selectAll(".before_plot").style("visibility", "hidden");

          // TO_DO_LIST xrange=, yrange=
          // make histogram
          // like data(distanceRentList.filter(funciton (d) { return d.rent >400}))
          // ploting(, "hist_eg");
          ploting(distanceRentList, "hist_eg");

          // make scatter plot
          ploting(distanceRentList, "scatter_eg");

        }
      })
      .style("fill", function(d) {
        return rentByGeoid[parseFloat(d.properties.GEOID)] > 0 ? color(rentByGeoid[parseFloat(d.properties.GEOID)]) : nondatacolor;
      })
      .style("stroke-width", "0.5px");

      svg
        .call(zoom)

  distanceRentList = Object.keys(distanceRent).map(function(key){return distanceRent[key];});


}




function ploting(given, target){

  d3.select("#"+target).selectAll("*").remove();

  var margineach = 0;
  var margin = {top: margineach, right: margineach, bottom: margineach, left: margineach};
  var width = document.getElementById(target).getBoundingClientRect().width;
  var height = document.getElementById(target).getBoundingClientRect().height;

  var distance = []

  var given_filtered = []

  var max_rent = 4000;
  var max_distance = 200;
  var th = 20;
  var rentThredhold = math.zeros(th)._data;
  var rentStackThredhold = math.zeros(th,6)._data;

  var sortedRentList = d3.nest()
      .key(function(d) { 
      var key = math.min(Math.floor(d.distance_to_center/max_distance * th), Math.floor(th)-1);
      var key2 = math.min(Math.floor(d.median_rent/500), 5);

      if (d.median_rent > 0 && d.median_rent < max_rent && d.distance_to_center<max_distance){
        rentThredhold[key] = rentThredhold[key] + d.median_rent;
        rentStackThredhold[key][key2] = rentStackThredhold[key][key2] + 1;
        given_filtered.push(d);
      }
      return key; })
      .entries(given);

  
  for (var i = 0; i < given_filtered.length; i++)
    {
    temp = given_filtered[i]['distance_to_center'];
    distance.push(temp);
    }

  var g = d3.select("#"+target)
          .append("g")

  var x = d3.scaleLinear()
          .domain([0, max_distance])
          .rangeRound([0, width]);

  var bins = d3.histogram()
      .domain(x.domain())
      .thresholds(x.ticks(th))(distance);

  bins.pop();

  var b = math.sum(rentStackThredhold,1),
      medianrent_matrix = math.transpose([b,b,b,b,b,b]),
      stacked_matrix = math.dotDivide(rentStackThredhold, medianrent_matrix),
      median_rent_interval = [];

  for (var i=0; i<th ; i++){
      median_rent_interval.push(Math.floor(rentThredhold[i]/b[i]));
  }
  // histogram
  if (target == "hist_eg") {


    var y = d3.scaleLinear()
        .domain([0, math.max(median_rent_interval)])
        .range([0, height]);

        y0 = d3.scaleLinear()
        .domain([0, math.max(median_rent_interval)])
        .range([height,0]);

    console.log(y(1800));
    var i, j;
    for (i= 0; i < th; i++){
      var bar = g.append("g")
            .attr("class", "bar").attr("transform", function() { return "translate(" + x(i / 20 * max_distance) + "," + 0 + ")"; });

      for (j= 0; j < 6; j++){
        
        bar.append("rect")
          .attr("x", 0)
          .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
          .attr("height", function() { 
            return  y(stacked_matrix[i][j] * median_rent_interval[i]); 
          })
          .attr("fill", function(){return color_domain[j];})
          .attr("transform", function() { 
            // + y(math.sum(stacked_matrix[i].slice(0,j+1)) * median_rent_interval[i])
            var ytransform = height - y(math.sum(stacked_matrix[i].slice(0,j+1)) * median_rent_interval[i]);
            return "translate(" + 0 + "," + ytransform + ")"; });

            }
      bar.append("text")
        .attr("dy", ".75em")
        .attr("y", 6)
        .attr("x", (x(bins[0].x1) - x(bins[0].x0)) / 2)
        .attr("text-anchor", "middle")
        .attr("visibility", "hidden")
        .text(median_rent_interval[i])
        .attr("transform", function(d) { return "translate(" + 0 + "," + (height - y(median_rent_interval[i]) - 20) + ")"; });

      bar.on("mouseover", function(d) {
        // d3.select(this).selectAll("text").attr("fill", "black");
        d3.select(this).selectAll("rect").style("opacity", 0);
        d3.select(this).selectAll("text").style("visibility", "visible");


      })                  
      bar.on("mouseout", function(d) {
        // d3.select(this).selectAll("text").attr("fill", "white");
        d3.select(this).selectAll("rect").style("opacity", 1);
        d3.select(this).selectAll("text").style("visibility", "hidden");
        // console.log("out")
      });

      g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y0))
    }
    

    
  }
  // scatter plot
  else if (target == "scatter_eg") {

    var y = d3.scaleLinear()
        .domain([0, max_rent])
        .range([height, 0]);

    var circle = g.selectAll("circle")
        .data(given_filtered.filter(function(d) { 
        return d.median_rent < max_rent }))
        .enter().append("circle")
        .attr("class", "dot")
          .attr("r", 1.5)
          .attr("fill", function(d){return color(d.median_rent);})
          .attr("cx", function (d) {
            return x(math.min(d.distance_to_center,max_distance))
          })
          .attr("cy", function (d) {
            return y(d.median_rent)
          })

    g.append("g")
      .attr("class", "axis axis--y")
      .attr("transform", "translate(0,"+ height +")")
      .call(d3.axisLeft(y))
      .attr("transform", "rotate(-360)");
  }

  

  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

  

  d3.selectAll("text").attr("fill", "#ffffff");

  d3.select("#"+target).append("text").text("Distance to your office (Mile)").attr("fill", "#ffffff").attr("font-size", "10px")
    .attr("transform", "translate("+0 +"," +  height*1.2+ ")");

  d3.select("#"+target).append("text").text("Rent($)").attr("fill", "#ffffff").attr("font-size", "10px")
    .attr("transform", "translate("+width*(-0.06) +"," +  1*(-10)+ ")");

}

function legendFn(){
  var margineach = 0,
      margin = {top: margineach, right: margineach, bottom: margineach, left: margineach},
      legend = d3.select('#legend'),
      width = document.getElementById("legend").getBoundingClientRect().width,
      height = document.getElementById("legend").getBoundingClientRect().height;
      g = d3.select("#legend").append("g")

  var x = d3.scalePoint()
          .domain(distance_domain_legend)
          .rangeRound([0, width]);
  var y = d3.scaleLinear()
          .domain([0, 1])
          .rangeRound([0, height]);

  var bar = g.selectAll("legendbar")
        .data(distance_domain_legend)
        .enter().append("g")
        .attr("class", "legendbar")
        .attr("transform", function(d,i) { return "translate(" + i* width/5 + "," + 0 + ")"; });

  bar.append("rect").data(distance_domain_legend)
      .attr("x", 0)
      .attr("width", width/5)
      .attr("height", y(0.8))
      .attr("transform", "translate(0,10)")
      .attr("fill", function(d,i){return color_domain[i]})

  d3.select("#legendtext").append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + 5 + ")")
      .call(d3.axisBottom(x));

  d3.selectAll("text").attr("fill", "#ffffff");

  d3.select("#legendtext").append("text").text("Median Gross Rent (USD)").attr("fill", "#ffffff").attr("font-size", "10px")
    .attr("transform", "translate("+0 +"," +  0+ ")");

  
}
d3.select(self.frameElement).style("height", height + "px");

function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.transition()
      .duration(750)
      .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) ); // updated for d3 v4
}

function zoomed(){
  d3.selectAll(".blk, .centroid")
    .attr("transform", d3.event.transform)
    .style("stroke-width", .5 / d3.event.scale + "px");
}

function findCenterCoord(l) {
  return math.mean([math.max(l,0), math.min(l,0)],0);
}
function transpose(a)
{
  return a[0].map(function (_, c) { return a.map(function (r) { return r[c]; }); });
}
// calculate real distance between two points

function getDistance(p1,p2){
    var radians = d3.geoDistance(p1,p2);
    return radians * 3959; // radius of earth
}