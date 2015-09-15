angular.module("CourseCalculator.controllers")

.controller("MainCtrl", function($filter, $http, $q, $scope, $timeout, $window,
                                 $ionicPopup, $ionicScrollDelegate, $ionicTabsDelegate,
                                 Classes, Course, geomag, LocationModal, x2js) {
  
  $scope.classes = Classes.getClasses();
  
  $scope.configuration = {
    fleet: {},
    course: {}
  };
  
  $scope.course = null;
  
  $scope.courses = Course.types;
  
  $scope.mapUpdateRequired = true; // Flag that indicates whether the map should be updated
  
  $scope.position = null;
  
  $scope.tabs = ["fleet", "course", "chart", "info", "gps", "debug"];
    
  // Initialise the controller
  $scope.init = function() {
    $scope.configuration = $scope.loadConfiguration();
    
    // Watch the configuration for any changes
    $scope.$watch("configuration", function() {
      $scope.saveConfiguration();
      $scope.course = Course.getCourse($scope.configuration);
      $scope.mapUpdateRequired = true;
    }, true);
    
    var geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000
    };
    
    navigator.geolocation.watchPosition($scope.onWatchPosition, function(err) {
      // TODO: Implement notification that location is not available
      console.log("Error getting location: " + err.message + " (" + err.code + ")");
      
    }, geoOptions);
    
    // For testing - select the tab being worked on
    $timeout(function() {
//      $ionicTabsDelegate.select(1);
    });
  };

  // Called when the enter latitude button is clicked
  $scope.doEnterLatitude = function() {
    LocationModal.show({
      showLat: true,
      lat: $scope.configuration.course.startPosition.lat
    }, $scope.onLocationModalCallback);
  };

  // Called when the enter longitude button is clicked
  $scope.doEnterLongitude = function() {
    LocationModal.show({
      showLon: true,
      lon: $scope.configuration.course.startPosition.lon
    }, $scope.onLocationModalCallback);
  };
  
  // Called when the GPS button is clicked
  $scope.doGetLocation = function() {
    var options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000
    };
    
    navigator.geolocation.getCurrentPosition($scope.onGotPosition, function(err) {
      // TODO: Implement error handling
      console.log("Error getting location: " + err.message + " (" + err.code + ")");
      
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
    
    // Update the class and course references to equal the loaded objects
    angular.forEach($scope.courses, function(item, key) {
      if (item.description === configuration.course.type.description)
        $scope.courses[key] = configuration.course.type;
    });
    for (var i = 0; i < $scope.classes.length; i++) {
      if ($scope.classes[i].name === configuration.fleet.class.name)
        $scope.classes[i] = configuration.fleet.class;
    }

    return configuration;
  };
  
  // Called when the NOAA geomag web service returns a result
  $scope.onGotMagGridResult = function(xml) {
    var x = new X2JS();
    var data = x.xml_str2json(xml);
    
    if (!data) {
      // TODO: implement errors
      return;
    }
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
  
  // Called when the location modal is closed
  $scope.onLocationModalCallback = function(result) {
    // The modal screws up the google maps element, so force the map to be updated
    // when the tab is next selected
    $scope.mapUpdateRequired = true;

    // May have an empty result
    if (!result)
      return;
    
    if (typeof result.lat !== "undefined")
      $scope.configuration.course.startPosition.lat = result.lat;

    if (typeof result.lon !== "undefined")
      $scope.configuration.course.startPosition.lon = result.lon;
  };

  // Called when a mark on the chart is clicked
  $scope.onMarkClick = function(mark) {
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
    } else {
      $ionicScrollDelegate.scrollTop(false);
    }
  };
  
  // Called when the goelocation watch function returns a result
  $scope.onWatchPosition = function(position) {
    // Clone this object so it can be cached - needs to be done manually
    $scope.position = {
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
    $scope.$apply("position");
  };
  
  // Saves the current configuration
  $scope.saveConfiguration = function() {
    var configuration = $scope.configuration;
    
    // Don't serialise the class or course type hash keys
    delete configuration.fleet.class["$$hashKey"];
    delete configuration.course.type["$$hashKey"];
    
    $window.localStorage.setItem("configuration", JSON.stringify($scope.configuration));
  };
  
  $scope.init();
})
;
