angular.module("CourseCalculator.controllers")

.controller("MainCtrl", function($filter, $http, $q, $rootScope, $scope, $timeout, $window,
                                 $ionicModal, $ionicPopover, $ionicPopup, $ionicScrollDelegate, $ionicTabsDelegate,
                                 Classes, Course, geomag, HelpModal, LocationModal) {
  
  $scope.classes = Classes.getClasses();
  
  //
  $scope.compass = {
    watch: null,
    options: {
      frequency: 250 // Limit refresh rate to 4hz
    },
    heading: null
  };

  $scope.configuration = {
    fleet: {},
    course: {}
  };
  
  $scope.course = null;
  
  $scope.courses = Course.types;

  $scope.gps = {
    watch: null, //
    position: null, // The current position
    options: {
      enableHighAccuracy: true,
      maximumAge: 0
    },
    destination: null,
    dials: null
  };
  
  $scope.mapUpdateRequired = true; // Flag that indicates whether the map should be updated

  $scope.popoverMore = null; // The more menu popover

  $scope.tabs = ["fleet", "course", "chart", "info", "gps", "debug"];

  // Raised when the app is paused
  $scope.$on("cordova.pause", function(event) {
    // Stop listening to the GPS, but don't persist the state so it can be resumed
    if ($scope.gps.watch)
      $scope.doToggleGPS(false);
  });

  // Raised when the app is paused
  $scope.$on("cordova.resume", function(event) {
    if (JSON.parse($window.localStorage.getItem("gps-state")))
      $scope.doToggleGPS(false);
  });
  
  // Raised when a modal is shown
  $rootScope.$on("modal.shown", function(event) {
    // The modal screws up the google maps element, so force the map to be updated
    // when the tab is next selected
    $scope.mapUpdateRequired = true;
  });
    
  // Initialise the controller
  $scope.init = function() {
    $scope.configuration = $scope.loadConfiguration();
    
    // Preload the popover
    $ionicPopover.fromTemplateUrl("templates/popover-main.html", {
      scope: $scope
    }).then(function(popover) {
      $scope.popoverMore = popover;
    });

    // Watch the configuration for any changes
    $scope.$watch("configuration", function() {
      $scope.saveConfiguration();
      $scope.course = Course.getCourse($scope.configuration);
      $scope.mapUpdateRequired = true;
    }, true);

    // Start the GPS
    if (JSON.parse($window.localStorage.getItem("gps-state")))
      $scope.doToggleGPS();

    // Start the compass
    if (navigator.compass) {
      // Only iOS supports the filter option
      if (ionic.Platform.isIOS())
        $scope.compass.options.filter = 1;

      $scope.compass.watch = navigator.compass.watchHeading(function(result) {
        // Cache and adjust for declination
        $scope.compass.heading = result;
        $scope.compass.heading.trueHeading = $scope.compass.heading.magneticHeading + ($scope.configuration.course.declination || 0);
        $scope.$apply("compass");
      }, function(error) {
        var msg;
        switch (error.code) {
          case error.COMPASS_INTERNAL_ERR:
            msg = "An internal compass error occurred";
            break;
          case error.COMPASS_NOT_SUPPORTED:
            msg = "Compass is not supported";
            break;
          default:
            msg = "An unexpected error occurred watching the compass";
            break;
        }
        console.log(msg);
      }, $scope.compass.options);
    }

    // For testing - select the tab being worked on
    $timeout(function() {
      //$ionicTabsDelegate.select(4);
    });
  };

  // Called when the enter latitude button is clicked
  $scope.doEnterLatitude = function() {
    $scope.doEnterLocation({
      lat: $scope.configuration.course.startPosition.lat
    });
  };

  $scope.doEnterLocation = function(params) {
    params.showLat = typeof params.lat === "number";
    params.showLon = typeof params.lon === "number";

    LocationModal.show(params)
    .then(function(result) {
      // May have an empty result
      if (!result)
        return;

      if (typeof result.lat !== "undefined")
        $scope.configuration.course.startPosition.lat = result.lat;

      if (typeof result.lon !== "undefined")
        $scope.configuration.course.startPosition.lon = result.lon;
    });
  };

  // Called when the enter longitude button is clicked
  $scope.doEnterLongitude = function() {
    $scope.doEnterLocation({
      lon: $scope.configuration.course.startPosition.lon
    });
  };
  
  // Called when the GPS button is clicked
  $scope.doGetLocation = function() {
    var options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };
    
    navigator.geolocation.getCurrentPosition($scope.onGotPosition, function(err) {
      var message;
      switch (err.code) {
        case err.POSITION_DENIED:
          message = "The app doesn't have permission to use the GPS.";
          break;

        case err.TIMEOUT:
          message = "Your location couldn't be found within " +
            $filter("number")(options.timeout / 1000, 0) + " seconds.<br>" +
            "Do you have a clear view of the sky?";
          break;

        default:
          message = "An error occurred getting the location.<br>Is your GPS enabled?";
          break;
      }

      console.log("Error getting location: " + err.message + " (" + err.code + ")");
      $scope.showError({
        title: "GPS Error",
        message: message
      });
      
    }, options);
  };
  
  // Called when the magnetic declination button is clicked
  $scope.doGetMagneticDeclination = function() {
    geomag.getDeclination({
      lat: $scope.configuration.course.startPosition.lat,
      lon: $scope.configuration.course.startPosition.lon,
    }).then(function(declination) {
      // To 1dp
      $scope.configuration.course.declination = Math.round(declination * 10) / 10;
      
    }).catch(function(error) {
      console.log(error);
    });
  };

  // Called by the load config button
  $scope.doLoadConfig = function() {
    $scope.popoverMore.hide();
  };

  // Called by the share button
  $scope.doShare = function() {
    $scope.popoverMore.hide();
  };

  // Called by the about button
  $scope.doShowAbout = function() {
    $scope.popoverMore.hide()
  };

  // Called when a help topic should be displayed
  $scope.doShowHelp = function(topic) {
    HelpModal.show(topic);
  };

  // Called when the toggle GPS buttons is clicked
  $scope.doToggleGPS = function(saveState) {
    if (typeof saveState !== "boolean")
      saveState = true;

    if ($scope.gps.watch) {
      navigator.geolocation.clearWatch($scope.gps.watch);
      $scope.gps.watch = null;
      $scope.onPositionChanged(null);

    } else {
      $scope.gps.watch = navigator.geolocation.watchPosition($scope.onWatchPosition, function(err) {
        console.log("Error getting location: " + err.message + " (" + err.code + ")");
      }, $scope.gps.options);
    }

    // Save the state
    if (saveState)
      $window.localStorage.setItem("gps-state", JSON.stringify($scope.gps.watch ? true : false));
  };

  // Gets the bearing from one point to another
  $scope.getBearing = function(start, end, back) {
    var brg = start.rhumbBearingTo(end);
    
    if (back)
      brg += 180;
    
    brg -= $scope.course.declination;
    
    return Math.round(brg + 360) % 360;
  };
  
  // Gets the default configuration
  $scope.getDefaultConfiguration = function() {
    var configuration = {
      fleet: {
        starters: 20,
        spacing: 120,
        tackAngle: 75
      },
      course: {
        wind: 225,
        type: $scope.courses.triangle,
        startPosition: {lat: 52.933019, lon: -8.309992},
        startPercentage: 33,
        declination: -4.1
      }
    };
    
    // Default to SOD
    angular.forEach($scope.classes, function(item, index) {
      if (item.name === "Shannon One Design")
        configuration.fleet.class = item;
    });
    
    return configuration;
  };
  
  // Gets the distance between the two points
  $scope.getDistance = function(start, end) {
    return start.rhumbDistanceTo(end);
  };
  
  $scope.getHeading = function() {
    var heading = null;

    // Only use gps heading of speed gr
    if ($scope.gps.position)
      heading = $scope.gps.position.coords.heading;

    if ((heading == null) && $scope.compass.heading && ($scope.compass.heading.trueHeading))
      heading = $scope.compass.heading.trueHeading;

    return heading;
  };

  // Gets a flag indicating whether the GPS data is stale
  $scope.getIsGPSState = function() {
    if (!$scope.gps.position)
      return true;

    // Threshold is 10s
    return (new Date().getTime() - $scope.gps.position.timestamp) > 10000;
  };

  // Gets the formatted latitude
  $scope.getLatitude = function(value) {
    return Dms.toLat(value, "dms", 2, true);
  };
  
  // Gets the length of the line (in metres)
  $scope.getLineLength = function() {
    var fleet = $scope.configuration.fleet;
    return fleet.class.loa * fleet.starters * fleet.spacing / 100;
  };
  
  // Gets the formatted latitude
  $scope.getLongitude = function(value) {
    return Dms.toLon(value, "dms", 2, true);
  };
  
  // Gets the true wind angle for the specified leg
  $scope.getTWA = function(leg) {
    var twa = Math.round(Math.abs((360 - leg.bearing + $scope.course.windTrue))) % 360;
    return twa > 180 ? 360 - twa : twa;
  };
  
  // Returns a flag indicating whether geolocation is available.
  $scope.hasGeoLocation = function() {
    return navigator.geolocation ? true : false;
  };
  
  // Loads the specified configuration
  $scope.loadConfiguration = function(configuration) {
    var oldVersion = localStorage.getItem("version") || "";
    if ($scope.VERSION !== oldVersion) {
      console.log("Version has changed from " + oldVersion + " to " + $scope.VERSION + " - removing configuration");
      $window.localStorage.removeItem("configuration");
      $window.localStorage.setItem("version", $scope.VERSION);
    }

    // Attempt to load a cached version is none is provided
    if (!configuration) {
      configuration = $window.localStorage.getItem("configuration");
      if (configuration) {
        try {
          configuration = JSON.parse(configuration);
        } catch (e) {}
      }
    }
    
    // Otherwise load the defaults
    if (!configuration)
      configuration = $scope.getDefaultConfiguration();
    
    // Update course references to equal the loaded objects
    angular.forEach($scope.courses, function(item, key) {
      if (item.description === configuration.course.type.description)
        $scope.courses[key] = configuration.course.type;
    });

    // If the class is editable, then update the custom definition, otherwise use the declared def
    if (configuration.fleet.class.canEdit) {
      var custom = $scope.classes[0];
      custom.loa = configuration.fleet.class.loa;
      custom.lwl = configuration.fleet.class.lwl || null;
      configuration.fleet.class = custom;

    } else {
      for (var i = 0; i < $scope.classes.length; i++) {
        if ($scope.classes[i].name === configuration.fleet.class.name) {
          configuration.fleet.class = $scope.classes[i];
        }
      }
    }



    for (var i = 0; i < $scope.classes.length; i++) {
      if ($scope.classes[i].name === configuration.fleet.class.name)
        $scope.classes[i] = configuration.fleet.class;
    }

    return configuration;
  };

  // Called when the destination waypoint is changed
  $scope.onDestinationChanged = function(event) {
    $scope.onPositionChanged($scope.gps.position);
  };

  // Called when the geolocation service returns a position
  $scope.onGotPosition = function(position, accept) {
    // If the position has been explicitly accepted
    if (accept) {
      $timeout(function() {
        $scope.configuration.course.startPosition.lat = position.coords.latitude;
        $scope.configuration.course.startPosition.lon = position.coords.longitude;
      });
      
      return;
    }
    
    var msg = "The location is accurate to " +
        $filter("number")(position.coords.accuracy, 0) +
        " metres.<br/>" +
        "Do you want to use it?";
    
    var options = {
      okText: "Yes",
      cancelText: "No",
      title: "Use location",
      template: msg
    };
    
    $ionicPopup.confirm(options).then(function(result) {
      if (result)
        $scope.onGotPosition(position, true);
    });
  };

  // Called when the GPS position is changed
  $scope.onPositionChanged = function(position) {
    var temp = null;
    var dials = {
      distance: null,
      bearing: null,
      vmg: null,
      turn: null,
      ttw: null
    };

    if (position) {
      // Clone this object so it can be cached - needs to be done manually
      var temp = {
        timestamp: position.timestamp,
        date: new Date(position.timestamp),
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        }
      };

      if ($scope.gps.destination) {
        var from = new LatLon(temp.coords.latitude, temp.coords.longitude);
        dials.distance = from.rhumbDistanceTo($scope.gps.destination.wgs);
        dials.bearing = from.rhumbBearingTo($scope.gps.destination.wgs);

        // Calculate VMG
        if (temp.coords.speed && temp.coords.heading) {
          // Calculate turn - Right: positive, Left: negative
          dials.turn = (360 + dials.bearing - temp.coords.heading) % 360;
          if (dials.turn >= 180)
            dials.turn = dials.turn - 360;

          // Calculate VMG, and Time-to-Waypoint if VMG is positive
          dials.vmg = temp.coords.speed * Math.cos(dials.turn.toRadians());
          if (dials.vmg > 0)
            dials.ttw = dials.distance / dials.vmg;
        }
      }
    }

    $scope.gps.position = temp;
    $scope.gps.dials = dials;
  };

  // Called when a mark on the chart is clicked
  $scope.onMarkClick = function(mark) {
    var msg = "Do you want set " + mark.name + " as your destination?";

    // Prompt the user to navigate to that marker
    $ionicPopup.confirm({
      title: "Navigate to waypoint",
      template: msg,
      okText: "Yes",
      cancelText: "No"
    }).then(function(result) {
      if (result) {
        $scope.gps.destination = mark;
        $ionicTabsDelegate.select($scope.tabs.indexOf("gps"));
      }
    });
  };
  
  // Called when a tab is selected
  $scope.onTabSelect = function($event) {
    var index = $ionicTabsDelegate.selectedIndex();
    if (index === -1)
      return;
    
    // Scroll to the top of the selected view
    var tab = $scope.tabs[index];
    if (tab === "chart") {
      // Trigger the windows resize event to make sure the google maps is the correct size
      if ($scope.mapUpdateRequired) {
        ionic.trigger("resize");
        $scope.mapUpdateRequired = false;
      }
      return;

    } else if (tab === "gps") {
      // Default to the committee vessel
      if (!$scope.gps.destination) {
        $scope.gps.destination = $scope.course.marks.cb;
        $scope.onPositionChanged($scope.gps.position);
      }

    }

    $ionicScrollDelegate.scrollTop(false);
  };
  
  // Called when the goelocation watch function returns a result
  $scope.onWatchPosition = function(position) {
    $scope.onPositionChanged(position);

    if ($ionicTabsDelegate.selectedIndex() == $scope.tabs.indexOf("gps"))
      $scope.$apply("gps");
  };
  
  // Saves the current configuration
  $scope.saveConfiguration = function() {
    var configuration = $scope.configuration;
    
    // Don't serialise the class or course type hash keys
    delete configuration.fleet.class["$$hashKey"];
    delete configuration.course.type["$$hashKey"];
    
    $window.localStorage.setItem("configuration", JSON.stringify($scope.configuration));
  };
  
  // Shows an error dialog
  $scope.showError = function(params) {
    params.title = params.title || "An error occurred";

    var scope = $scope.$new(true);
    scope.message = params.message;

    return $ionicPopup.alert({
      scope: scope,
      title: params.title,
      templateUrl: "templates/popup-alert.html",
      okText: "Close"
    });
  };

  $scope.init();
})
;
