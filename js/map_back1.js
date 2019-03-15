// placeholder of histogram chart


var width = Math.max(960, window.innerWidth),
    height = Math.max(500, window.innerHeight),
    radius = 6,
    fill = "rgba(255, 49, 255, 0.388)",
    stroke = "rgba(0, 0, 0, 0.5)",
    strokeWidth = 0.1,
    pi = Math.PI,
    tau = 2 * Math.PI;

// button of click to point office location
var selectWorkLoc = false;
document.getElementById('selectPt').onclick = function(){
  selectWorkLoc = true; console.log(selectWorkLoc);
  d3.selectAll('#workloc').remove();
};

// map generate from here

// define projection to NY
var projection = d3.geoAlbers()
    .scale( 1 / tau )
    .rotate( [73.977,0] )
    .center( [0, 40.753] )
    .translate([0,0]  );//[width/2,height/2]

var path = d3.geoPath()
    .projection( projection );

var tile = d3.tile().size([width, height]);

var zoom = d3.zoom()
    .scaleExtent([1 << 11, 1 << 14])
    .on("zoom", zoomed);

// make a svg to hold the map
var svg = d3.select("#mapcontainer").append("svg")
    .attr("width", width)
    .attr("height", height);

var raster = svg.append("g");
var vector = svg.append("path");

// var tiles = d3.tile()
//                       .size([width, height])
//                       .scale(projection.scale() * tau)
//                       .translate(projection([0, 0]));

// console.log(tiles.scale);

// import data
d3.queue()
    .defer(d3.json, "data/nynj.json")
    .defer(d3.csv, "data/Rent_2017_5yr_NYNJ.csv")
    .await(ready);

// RASTER BASE MAP    

function zoomed() {
  var transform = d3.event.transform;

  var tiles = tile
      .scale(transform.k)
      .translate([transform.x, transform.y])
      ();

  projection
      .scale(transform.k / tau)
      .translate([transform.x, transform.y]);

  vector.attr("d", path);

  var image = raster
      .attr("transform", stringify(tiles.scale, tiles.translate))
    .selectAll("image")
    .data(tiles, function(d) { return d; });

  image.exit().remove();

  image.enter().append("image")
      .attr("xlink:href", function(d) { return "http://" + "abc"[d[1] % 3] + ".tile.openstreetmap.org/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
      .attr("x", function(d) { return d[0] * 256; })
      .attr("y", function(d) { return d[1] * 256; })
      .attr("width", 256)
      .attr("height", 256);
}


function stringify(scale, translate) {
  var k = scale / 256, r = scale % 1 ? Number : Math.round;
  return "translate(" + r(translate[0] * scale) + "," + r(translate[1] * scale) + ") scale(" + k + ")";
}

// start construct an array of objects that includes geoid, centerCoord_long, centerCoord_lat, distance_to_center, median_rent
var distanceRent = {}; 
var distanceRentList =[];

function ready(error, us, rent) {
  if (error) throw error;

  // create a dictionary mapping GEOID: Median Gross Rent

 // console.log(us);
 // console.log(rent)

  var rentByGeoid = {}; // Create empty object for holding dataset
  rent.forEach(function(d) {
    var geoid = parseFloat(d['Geographic Identifier'].substr(7,));
    rentByGeoid[geoid] = + parseFloat(d['Median Gross Rent']);
    distanceRent[geoid] = {"geoid":geoid, "median_rent" : parseFloat(d['Median Gross Rent']), "centerCoord_long": 0 ,"centerCoord_lat": 0 ,"distance_to_center":-1};
  });

  


  // test loading
  console.log(rentByGeoid[360550116014]);

  // Define color scale

  var color = d3.scaleThreshold()
    .domain([500, 1000, 1500, 2000, 2500])
    .range(["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"]);

  // get features from map
  var features = topojson.feature(us, us.objects.NYNJ_merge).features;

  // var g = svg.append("g");
  // vector.datum(topojson.feature(world, world.objects.countries));

  g.attr("class", "blkgroup")
    .selectAll("path")
      .data(features)
    .enter().append("path")
      .attr("class", "blk")
      .attr("d", path)
      .filter(function(d) { 
        // console.log(d.geometry.coordinates.length);
        // console.log(d.geometry.coordinates[0][0].length);
        // && d.geometry.coordinates instanceof Array && d.geometry.coordinates.length[0] > 3 && d.geometry.coordinates[0][0].length == 2;
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
      .on('click', function(d) {
        if (selectWorkLoc==true) {
          // console.log('click');
          // console.log(features)
          // console.log(d.geometry.coordinates);
          // console.log(math.mean(d.geometry.coordinates,1));
          // console.log(path.centroid(d));

          // get the center of the shape
          var t = path.centroid(d)
          t = [Math.round(t[0]),Math.round(t[1])]

          svg.selectAll(".centroid").data([t])
            .enter().append("circle")
              .attr("class", "centroid")
              .attr("id", "workloc")
              .attr("fill", fill)
              .attr("stroke", stroke)
              .attr("stroke-width", strokeWidth)
              .attr("r", radius)
              .attr("cx", function (t){ return t[0]; })
              .attr("cy", function (t){ return t[1]; })
              .attr("transform", function(t) {return "translate("+t[0]+" px, "+t[1]+" px)";});
          selectWorkLoc=false;

          var centroidCoord = [d3.select(this).attr("centerCoord_long"),d3.select(this).attr("centerCoord_lat")]

          // calculate the distance between this point and others
          // svg.selectAll(".blk").attr("distance", d3.select(this).attr("centerCoord_long"))
          d3.selectAll(".blk").each(function(d,i){
              var elt = d3.select(this);
              // console.log( elt.attr("centerCoord_long") - centroidCoord[0]);
              p1 = [elt.attr("centerCoord_long"),elt.attr("centerCoord_lat")];
              p2 = centroidCoord;
              distanceRent[parseFloat(d.properties.GEOID)]["distance_to_center"] = getDistance(p1,p2);
              elt.attr("distance",getDistance(p1,p2));
          });

          distanceRentList = Object.keys(distanceRent).map(function(key){return distanceRent[key];});

          console.log(distanceRent[360550116014]);

          // data.forEach(function(d)

          d3.select("#scatterplot").data(distanceRentList)
            .enter().select("svg")
            .append("g")
            .append("circle")
            .attr("class", "dot")
            .attr("r", 3.5)
            .attr("cx", "5px")
            .attr("cy", "5px")
            .style("fill", function(y) {
              // console.log('start plot svg');
              console.log(y.median_rent);
              return color(distanceRent[parseFloat(y.geoid)])
            });
        }
      })
      .style("fill", function(d) {return color(rentByGeoid[parseFloat(d.properties.GEOID)])})
      .style("stroke", "black");

      var center = projection([-98.5, 39.5]);

      // Apply a zoom transform equivalent to projection.{scale,translate,center}.
      svg
          .call(zoom)
          .call(zoom.transform, d3.zoomIdentity
              .translate(width / 2, height / 2)
              .scale(1 << 12)
              .translate(-center[0], -center[1]));

      

  distanceRentList = Object.keys(distanceRent).map(function(key){return distanceRent[key];});
  console.log(distanceRent[360550116014]);

  // get all centroids
  var centroids = features.map(function (feature){
    return path.centroid(feature);
  });

}

// scatter plot code here
var scattersvg = d3.select("#scatterplot").append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .data(distanceRentList)
    .enter()
    .append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", "5px")
      .attr("cy", "5px")
      .style("fill", function(d) {
        console.log('start plot svg');
        console.log(d.median_rent);
        return color(distanceRent[parseFloat(d["geoid"])])
      });

var data = [30, 86, 168, 281, 303, 365];

// histogram plot code here
hist = d3.select("#histogram").select(".chart")
  .selectAll("div")
  .data(distanceRentList)
    .enter()
    .append("div")
    .style("height", function(d) { return d.median_rent/1000 + "px"; })

d3.select(self.frameElement).style("height", height + "px");

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