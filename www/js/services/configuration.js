angular.module("CourseCalculator.services")

.service("Configuration", function($q, $window,
                                   Classes) {

  var STORAGE_KEY = "CourseCalculator.Configuration";

  // Course types
  var types = {
    triangle: {description: "Triangle", params: {length: 1500, width: 500, angle1: 120}},
    trapezoid: {description: "Trapezoid", params: {length: 1500, width: 500, angle1: 100, angle2: 120}},
    wl: {description: "Windward-Leeward", params: {length: 1500, width: 0}},
    wlspreader: {description: "Windard-Leeward w. Spreader", params: {length: 1500, width: 100, angle1: 90}}
  };

  /* ===========================
     Course
     =========================*/
  function Course(params) {
    // Defaults
    params = params || {
      wind: 225,
      type: types.triangle,
      startPosition: {lat: 52.933019, lon: -8.309992}, // South of the Corrikeen Islands, Lough Derg
      startPercentage: 33,
      declination: -4.1 // As of September 2015
    };

    // Course type defaults to Triangle
    var found = null;
    angular.forEach(types, function(item, key) {
      if (!found && (item.description === params.type.description))
        found = item;
    });

    // In case a duff name was passed
    if (!found)
      found = types.triangle;

    // Copy in the parameters
    if (params.type.params) {
      found.params.length = params.type.params.length || 1500;
      found.params.width = params.type.params.width || 500;
      if (found.params.angle1)
        found.params.angle1 = params.type.params.angle1 || 120;
      if (found.params.angle2)
        found.params.angle2 = params.type.params.angle2 || 120;
    }

    params.type = found;

    angular.extend(this, params);
  };


  /* ===========================
     Fleet
     =========================*/
  function Fleet(params) {
    // Class defaults to SOD
    var sod = Classes.getClasses("Shannon One Design");

    // Defaults
    params = params || {
      starters: 20,
      spacing: 120,
      tackAngle: 75,
      class: sod
    };

    var found = null;
    angular.forEach(Classes.getClasses(), function(item, index) {
      if (!found && (item.name === params.class.name))
        found = item;
    });

    // In case a duff class was passed
    if (!found)
      found = sod;

    // If the class is editable, then copy in its parameters
    if (found.canEdit && params.class) {
      found.loa = params.loa || null;
      found.lwl = params.lwl || null;
    }

    params.class = found;

    angular.extend(this, params);
  };

  // Gets the length of the line
  Fleet.prototype.getLineLength = function() {
    if (this.class && this.class.loa) {
      return this.class.loa * (this.starters || 0) * (this.spacing || 100) / 100;
    } else {
      return null;
    }
  };


  /* ===========================
     Configuration
     =========================*/
  function Configuration(params) {
    this.fleet = new Fleet(params ? params.fleet : null);

    this.course = new Course(params ? params.course : null);
  };

  // Calculates the course properties
  Configuration.prototype.calculate = function() {
    var $this = this;

    var resp = {
      length: $this.course.type.params.length,
      width: $this.course.type.params.width,
      eta: ($this.course.startPercentage || 0) / 100,
      windMag: $this.course.wind || 0,
      declination: $this.course.declination || 0,
      line: $this.fleet.getLineLength() | 100,
      tackAngle: $this.fleet.tackAngle || 0,
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
      wgs: new LatLon($this.course.startPosition.lat || 0, $this.course.startPosition.lon ||0)
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

    if (($this.course.type === types.triangle) || ($this.course.type === types.wlspreader)) {
      // Triangle course
      resp.marks.list.push({
        name: ($this.course.type === types.wlspreader) ? "Spreader" : "Gybe",
        x: -resp.width,
        y: resp.marks.windward.y - (resp.width / Math.tan((180 - $this.course.type.params.angle1).toRadians()))
      });

    } else if ($this.course.type === types.trapezoid) {
      // Trapezoid course
      resp.marks.list.push({
        name: "Gybe #1",
        x: -resp.width,
        y: resp.marks.windward.y - (resp.width / Math.tan((180 - $this.course.type.params.angle1).toRadians()))
      });
      resp.marks.list.push({
        name: "Gybe #2",
        x: -resp.width,
        y: resp.width * Math.tan(($this.course.type.params.angle2 - 90).toRadians())
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

  // Saves the configuration
  Configuration.prototype.save = function() {
    var clone = angular.copy(this);

    // Remove any hashkeys
    delete clone.fleet.class.$$hashKey;
    delete clone.course.type.$$hashKey;

    $window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
  };


  /* ===========================
     Service methods
     =========================*/

  // Gets the types of courses
  this.getCourseTypes = function() {
    return types;
  };

  // Loads the configuration from local storage
  this.load = function(text) {
    var q = $q.defer();

    var params = null;
    if (text) {
      try {
        params = JSON.parse(text);
      } catch (e) {
        console.error(e);
        q.reject(e);
        return q.promise;
      }
    }

    if (!params) {
      var cached = $window.localStorage.getItem(STORAGE_KEY);
      if (cached) {
        params =JSON.parse(cached);
      }

    }

    var config = new Configuration(params);
    q.resolve(config);

    return q.promise;
  };

})
;
