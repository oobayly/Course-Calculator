angular.module("CourseCalculator.services")

.service("Course", function($window, Classes) {
  this.types = {
    triangle: {description: "Triangle", params: {length: 1500, width: 500, angle1: 120}},
    trapezoid: {description: "Trapezoid", params: {length: 1500, width: 500, angle1: 100, angle2: 120}},
    wl: {description: "Windward-Leeward", params: {length: 1500, width: 0}},
    wlspreader: {description: "Windard-Leeward w. Spreader", params: {length: 1500, width: 100, angle1: 90}}
  };
  
  this.__config = {
    fleet: {
      starters: 20,
      spacing: 120,
      tackAngle: 75,
      getLineLength: function() {
        if (this.class && this.class.loa) {
          return this.class.loa * this.starters * this.spacing;
        } else {
          return null;
        }
      }
    },
    course: {
      wind: 225,
      startPosition: {lat: 52.933019, lon: -8.309992}, // South of the Corrikeen Islands, Lough Derg
      startPercentage: 33,
      declination: -4.1 // As of September 2015
    },
    save: function() {
      $window.localStorage.setItem("CourseCalculator.Configuration", JSON.stringify(this));
    }
  };
  
  this.getCourse = function(config) {
    var resp = {
      length: config.course.type.params.length,
      width: config.course.type.params.width,
      eta: (config.course.startPercentage || 0) / 100,
      windMag: config.course.wind || 0,
      declination: config.course.declination || 0,
      line: (config.fleet.class.loa * config.fleet.starters * config.fleet.spacing / 100) || 100,
      tackAngle: config.fleet.tackAngle || 0,
      marks: {
        list: [],
        allMarks: []
      },
      legs: []
    };
    
    // Wind direction (true North)
    resp.windTrue = resp.windMag + resp.declination;
    
    // Make sure the committe boat location is valid
    resp.marks.cb = {
      name: "Committee Boat",
      wgs: new LatLon(config.course.startPosition.lat || 0, config.course.startPosition.lon ||0)
    };
    
    // Leeward mark is at the origin
    resp.marks.leeward = {
      name: "Leeward",
      x: 0, y: 0
    };
    
    if (resp.eta) {
      // Pin is located so that it (eta * length) upwind of the leeward,
      // but also 1/2 the line length to the left
      resp.marks.pin = {
        name: "Pin end",
        x: -resp.line / 2,
        y: resp.eta * resp.length
      };
    } else {
      // Pin is also the leeward mark
      resp.marks.pin = resp.marks.leeward;
    }
    
    // Committe boat is to the right of the pin
    resp.marks.cb.x = resp.marks.pin.x + resp.line;
    resp.marks.cb.y = resp.marks.pin.y;

    // Windward is upwind of the leeward
    resp.marks.windward = {
      name: "Windward",
      x: 0,
      y: resp.length
    };
    
    resp.marks.list.push(resp.marks.leeward);
    resp.marks.list.push(resp.marks.windward);
    
    if ((config.course.type === this.types.triangle) || (config.course.type === this.types.wlspreader)) {
      // Triangle course
      resp.marks.list.push({
        name: (config.course.type === this.types.wlspreader) ? "Spreader" : "Gybe",
        x: -resp.width,
        y: resp.marks.windward.y - (resp.width / Math.tan((180 - config.course.type.params.angle1).toRadians()))
      });
      
    } else if (config.course.type === this.types.trapezoid) {
      // Trapezoid course
      resp.marks.list.push({
        name: "Gybe #1",
        x: -resp.width,
        y: resp.marks.windward.y - (resp.width / Math.tan((180 - config.course.type.params.angle1).toRadians()))
      });
      resp.marks.list.push({
        name: "Gybe #2",
        x: -resp.width,
        y: resp.width * Math.tan((config.course.type.params.angle2 - 90).toRadians())
      });
      
    }
    
    // Create a temporay array of all the marks *and* the pin
    resp.marks.allMarks = resp.marks.list.slice(0);
    if (resp.eta)
      resp.marks.allMarks.push(resp.marks.pin);
    resp.marks.allMarks.push(resp.marks.cb);
    
    angular.forEach(resp.marks.allMarks, function(mark, index) {
      // Skip the committee boat
      if (mark === resp.marks.cb)
        return;
      
      var dx = mark.x - resp.marks.cb.x;
      var dy = mark.y - resp.marks.cb.y;
      
      var theta = Math.atan2(dx, dy).toDegrees(); // Angle from cb to mark (rotate to match course coordinates)
      theta = (theta + 360 + resp.windTrue) % 360; // Rotate for wind direction and normalise
      
      var distance = Math.sqrt((dx * dx) + (dy * dy)); // Distance from cb to mark in metres
      
      mark.wgs = resp.marks.cb.wgs.rhumbDestinationPoint(distance, theta);
    });
    
    // Generate each leg
    for (var i = 0; i < resp.marks.list.length; i++) {
      var start = resp.marks.list[i];
      var end = resp.marks.list[(i + 1) === resp.marks.list.length ? 0 : i + 1];
      
      resp.legs.push({
        start: start.wgs,
        end: end.wgs,
        distance: start.wgs.rhumbDistanceTo(end.wgs),
        bearing: start.wgs.rhumbBearingTo(end.wgs)
      });
    }
    
    return resp;
  };

//  this.getConfiguration = function(cached) {
//    var config = angular.copy(this.__config);
//
//    // If no cached configuration has been provided, then load from local storage
//    if (!cached) {
//      try {
//        cached = JSON.parse($window.localStorage.getItem("CourseCalculator.Configuration") || "{}");
//      } catch (e) {
//        cached = {};
//      }
//    }
//    
//    // For debugging
//    cached = {
//      fleet: {
//        starters: 30
//      }
//    };
//    
//    // Default to using SOD and a triangle course
//    angular.forEach(Classes.getClasses(), function(item, index) {
//      if (item.name === "Shannon One Design") {
//        config.fleet.class = item;
//      }
//    });
//    config.course.type = this.types.triangle;
//    
//    // Use the cached fleet and course
//    if (cached.fleet)
//      angular.extend(config.fleet, cached.fleet);
//    if (cached.course)
//      angular.extend(config.course, cached.course);
//
//    
//    // Update the class and course references to equal the loaded objects
//    angular.forEach(this.types, function(item, key) {
//      if (item.description === config.course.type.description)
//        this.types[key] = config.course.type;
//    });
//    for (var i = 0; i < $scope.classes.length; i++) {
//      if ($scope.classes[i].name === configuration.fleet.class.name)
//        $scope.classes[i] = configuration.fleet.class;
//    }
//    
//    
//    
//    console.log(config);
//    
//  };
});
