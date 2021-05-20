var rgb = {
  bands: ["B4", "B3", "B2"],
  min: [0.025, 0.048, 0.065],
  max: [0.24, 0.249, 0.254],
  gamma: [2.2, 2.2, 2.2],
};

var rgb_sr = {
  bands: ["B4", "B3", "B2"],
  min: [0.03, 0.04, 0.03],
  max: [0.15, 0.15, 0.15],
  gamma: [1.0, 1.0, 1.0],
};

var veg_ir = {
  bands: ["B8", "B4", "B3"],
  min: [0.12, 0.03, 0.053],
  max: [0.5, 0.09, 0.12],
  gamma: [1.2, 1.2, 1.2],
};

var veg_ir_sr = {
  bands: ["B8", "B4", "B3"],
  min: [0.12, 0.03, 0.053],
  max: [0.5, 0.09, 0.12],
  gamma: [1.2, 1.2, 1.2],
};

function mergeObjects() {
  var res = {};
  for (var i = 0; i < arguments.length; i++) {
    for (var x in arguments[i]) {
      res[x] = arguments[i][x];
    }
  }
  return res;
}

function scale(image) {
  return image.divide(10000).copyProperties(image, ["system:time_start"]);
}

// Create a panel to hold the chart.
var panel = ui.Panel();
panel.style().set({
  width: "400px",
  height: "500px",
  position: "bottom-right",
});

var controlPanel = ui.Panel();
controlPanel.style().set({
  width: "400px",
  // height: "100px",
  position: "bottom-left",
});

Map.add(controlPanel);

var enhancedContrast = false;
var enhancedLocalContrast = false;
var falseColor = false;
var sr = false;
var limitToOnePerMonth = true;

controlPanel.add(
  ui.Label(
    "Click on the map to get all cloud-free Sentinel-2 imagery for a 16 km^2 region around the selected point. Click on an individual image to add it to the map."
  )
);

var startDate = "2015-01-01";

controlPanel.add(
  ui.Panel(
    [
      ui.Label("Search start date"),
      ui.Textbox({
        value: startDate,
        onChange: function (value) {
          startDate = value;
        },
      }),
    ],
    ui.Panel.Layout.flow("horizontal")
  )
);

var currentDate = new Date();
var month = (currentDate.getMonth() + 1).toString();
if (month.length == 1) month = "0" + month;
var day = (currentDate.getDay() + 1).toString();
if (day.length == 1) day = "0" + day;

var endDate = currentDate.getFullYear() + "-" + month + "-" + day;

controlPanel.add(
  ui.Panel(
    [
      ui.Label("End date"),
      ui.Textbox({
        value: endDate,
        onChange: function (value) {
          endDate = value;
        },
      }),
    ],
    ui.Panel.Layout.flow("horizontal")
  )
);

controlPanel.add(
  ui.Checkbox({
    label: "IR False Color",
    value: false,
    onChange: function (ir) {
      falseColor = ir;
    },
  })
);
controlPanel.add(
  ui.Checkbox({
    label: "Atmospheric corrected (2018-)",
    value: false,
    onChange: function (c) {
      sr = c;
    },
  })
);

var localContrastCheckbox = ui.Checkbox({
  label: "Enhance contrast locally",
  value: false,
  onChange: function (contrast) {
    enhancedLocalContrast = contrast;
  },
});

localContrastCheckbox.setDisabled(true);

controlPanel.add(
  ui.Checkbox({
    label: "Enhance contrast",
    value: false,
    onChange: function (contrast) {
      enhancedContrast = contrast;
      localContrastCheckbox.setDisabled(!contrast);
    },
  })
);

controlPanel.add(localContrastCheckbox);

controlPanel.add(
  ui.Checkbox({
    label: "Limit to one image per month (recommended for large timeranges)",
    value: true,
    onChange: function (limit) {
      limitToOnePerMonth = limit;
    },
  })
);

function addClickedImage(image, date, color) {
  var collection = ee.ImageCollection(
    sr ? "COPERNICUS/S2_SR" : "COPERNICUS/S2"
  );

  image.get("system:index").evaluate(function (id) {
    var fullImage = collection
      .filterMetadata("system:index", "equals", id)
      .map(scale)
      .first();

    image = fullImage.resample("bicubic");

    // Define a Laplacian, or edge-detection kernel.
    var laplacian = ee.Kernel.laplacian8({ normalize: false, magnitude: 0.05 });

    // Apply the edge-detection kernel.
    var edgy = image.convolve(laplacian);

    var sharpened = image.subtract(edgy);

    Map.addLayer(sharpened, color, date.toISOString());
  });
}

function makeAddClickedImage(image, date, color) {
  return function () {
    addClickedImage(image, date, color);
  };
}

function makeDisplayThumbWithDate(image, panel, buffer, color) {
  return function (d) {
    var date = new Date(parseInt(d));
    panel.add(ui.Label(date.toISOString()));

    var color;

    if (enhancedContrast) {
      var ir_p1 = image.getNumber("ir_p1");
      var ir_p99 = image.getNumber("ir_p99");
      var ir_p50 = image.getNumber("ir_p50");
      var r_p1 = image.getNumber("r_p1");
      var r_p99 = image.getNumber("r_p99");
      var r_p50 = image.getNumber("r_p50");
      var g_p1 = image.getNumber("g_p1");
      var g_p99 = image.getNumber("g_p99");
      var g_p50 = image.getNumber("g_p50");
      var b_p1 = image.getNumber("b_p1");
      var b_p99 = image.getNumber("b_p99");
      var b_p50 = image.getNumber("b_p50");

      var b_gamma = b_p50
        .subtract(b_p1)
        .divide(b_p99.subtract(b_p1))
        .log()
        .divide(ee.Number(0.5).log())
        .subtract(ee.Number(1))
        .divide(ee.Number(3))
        .add(ee.Number(1));

      var r_gamma = r_p50
        .subtract(r_p1)
        .divide(r_p99.subtract(r_p1))
        .log()
        .divide(ee.Number(0.5).log())
        .subtract(ee.Number(1))
        .divide(ee.Number(3))
        .add(ee.Number(1));

      var g_gamma = g_p50
        .subtract(g_p1)
        .divide(g_p99.subtract(g_p1))
        .log()
        .divide(ee.Number(0.5).log())
        .subtract(ee.Number(1))
        .divide(ee.Number(3))
        .add(ee.Number(1));

      var ir_gamma = ir_p50
        .subtract(ir_p1)
        .divide(ir_p99.subtract(ir_p1))
        .log()
        .divide(ee.Number(0.5).log())
        .subtract(ee.Number(1))
        .divide(ee.Number(3))
        .add(ee.Number(1));

      if (falseColor) {
        color = ee.Dictionary({
          bands: ["B8", "B4", "B3"],
          min: [ir_p1, r_p1, g_p1],
          max: [ir_p99, r_p99, g_p99],
          gamma: [ir_gamma, r_gamma, g_gamma],
        });
      } else {
        color = ee.Dictionary({
          bands: ["B4", "B3", "B2"],
          min: [r_p1, g_p1, b_p1],
          max: [r_p99, g_p99, b_p99],
          gamma: [r_gamma, g_gamma, b_gamma],
        });
      }
    } else {
      color = sr
        ? falseColor
          ? veg_ir_sr
          : rgb_sr
        : falseColor
        ? veg_ir
        : rgb;

      color = ee.Dictionary(color);
    }

    color.evaluate(function (color) {
      var thumb = ui.Thumbnail({
        image: image,
        params: mergeObjects(
          {
            dimensions: 256,
            region: buffer,
            format: "jpg",
          },
          color
        ),
        onClick: makeAddClickedImage(image, date, color),
      });

      panel.add(thumb);
    });
  };
}

function filterOnePerMonth(collection) {
  var year = 2015;
  var month = 1;
  var images = [];

  while (year <= parseInt(new Date().getFullYear())) {
    while (month <= 12) {
      var start = year + "-" + ("0" + month).slice(-2) + "-01";
      var end = year + "-" + ("0" + (month + 1)).slice(-2) + "-01";
      if (month == 12) {
        end = year + 1 + "-01-01";
      }

      var image = collection.filterDate(start, end).sort("cover").first();
      images.push(image);

      month += 1;
    }

    year += 1;
    month = 1;
  }

  return ee.ImageCollection(images);
}

function getImagesAtPoint(coords) {
  panel.clear();
  Map.clear();
  Map.add(panel);
  Map.add(controlPanel);
  Map.onClick(getImagesAtPoint);

  var point = ee.Geometry.Point(coords.lon, coords.lat);
  var buffer = point.buffer(2000).bounds();

  function getCloudPixels(image) {
    var not_clouds = image.select("B2").lt(0.35).rename("not_clouds");

    image = image.addBands(not_clouds);

    var sum = image
      .select("not_clouds")
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: image.geometry(),
        scale: 10,
        maxPixels: 1e9,
      })
      .get("not_clouds");

    var count = buffer.area(0.05).multiply(0.01);

    var cloud_cover_roi = ee
      .Number(1)
      .subtract(ee.Number(sum).divide(count))
      .multiply(100);

    var percentiles = image.mask(not_clouds).reduceRegion({
      reducer: ee.Reducer.percentile([0.5, 40, 99.5], ["p1", "p50", "p99"]),
      geometry: enhancedLocalContrast ? buffer : image.geometry(),
      scale: 10,
      maxPixels: 1e9,
    });

    image = image.set("count", count);
    image = image.set("sum", sum);
    image = image.set("cover", cloud_cover_roi);

    image = image.set("ir_p1", percentiles.get("B8_p1"));
    image = image.set("ir_p50", percentiles.get("B8_p50"));
    image = image.set("ir_p99", percentiles.get("B8_p99"));
    image = image.set("r_p1", percentiles.get("B4_p1"));
    image = image.set("r_p50", percentiles.get("B4_p50"));
    image = image.set("r_p99", percentiles.get("B4_p99"));
    image = image.set("g_p1", percentiles.get("B3_p1"));
    image = image.set("g_p50", percentiles.get("B3_p50"));
    image = image.set("g_p99", percentiles.get("B3_p99"));
    image = image.set("b_p1", percentiles.get("B2_p1"));
    image = image.set("b_p50", percentiles.get("B2_p50"));
    image = image.set("b_p99", percentiles.get("B2_p99"));

    return image;
  }

  Map.addLayer(buffer, { color: "FF0000" });

  // Load Sentinel-2 TOA reflectance data.
  var collection = ee
    .ImageCollection(sr ? "COPERNICUS/S2_SR" : "COPERNICUS/S2")
    .filterBounds(point)
    .filterDate(startDate, endDate)
    // Pre-filter to get less cloudy granules.
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15))
    .map(scale)
    .map(function (image) {
      return image.clip(buffer);
    })
    .map(getCloudPixels)
    .filter(ee.Filter.lt("cover", 5));

  if (limitToOnePerMonth) {
    collection = filterOnePerMonth(collection);
  }

  var size = collection.size();

  panel.add(
    ui.Label("Searching for cloud free images. This may take a few moments.")
  );

  size.evaluate(function (size) {
    if (size === 0) {
      panel.add(ui.Label("No cloud free images found"));
    }

    var listOfImages = collection.toList(size);

    for (var i = 0; i < size; i++) {
      var subpanel = ui.Panel();
      panel.add(subpanel);
      var image = ee.Image(listOfImages.get(i));

      var d = image
        .get("system:time_start")
        .evaluate(makeDisplayThumbWithDate(image, subpanel, buffer));
    }
  });
}

Map.onClick(getImagesAtPoint);
