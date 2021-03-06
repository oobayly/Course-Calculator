angular.module("CourseCalculator")

.directive("chart", function($rootScope, $timeout, $window) {
  var iconBoat = null;

  var iconMark = null;

  var markLocation = {
    stationary: null,
    moving: null
  };

  var createLines = function(course) {
    var lines = [];

    // Create the course
    var coords = [];
    angular.forEach(course.marks.list, function(item, index) {
      coords.push({lat: item.wgs.lat, lng: item.wgs.lon});
    });
    coords.push(angular.copy(coords[0]));

    lines.push(new google.maps.Polyline({
      path: coords,
      geodesic: true,
      strokeColor: "red",
      strokeOpacity: 1,
      strokeWeight: 3,
    }));

    // Create the start line
    coords = [
      {lat: course.marks.cb.wgs.lat, lng: course.marks.cb.wgs.lon},
      {lat: course.marks.pin.wgs.lat, lng: course.marks.pin.wgs.lon}
      ];

    lines.push(new google.maps.Polyline({
      path: coords,
      geodesic: true,
      strokeColor: "white",
      strokeOpacity: 1,
      strokeWeight: 3,
    }));

    // Lay lines
    if (course.tackAngle) {
      var twa = course.tackAngle / 2;
      var p1, p2;

      // From leeward
      p1 = course.marks.leeward.wgs.rhumbDestinationPoint(course.length / 2, course.windTrue - twa);
      p2 = course.marks.leeward.wgs.rhumbDestinationPoint(course.length / 2, course.windTrue + twa);
      lines.push(new google.maps.Polyline({
        path: [
          {lat: p1.lat, lng: p1.lon},
          {lat: course.marks.leeward.wgs.lat, lng: course.marks.leeward.wgs.lon},
          {lat: p2.lat, lng: p2.lon}
          ],
        geodesic: true,
        strokeColor: "green",
        strokeOpacity: 1,
        strokeWeight: 1
      }));

      // To windward
      p1 = course.marks.windward.wgs.rhumbDestinationPoint(course.length / 2, course.windTrue - twa - 180);
      p2 = course.marks.windward.wgs.rhumbDestinationPoint(course.length / 2, course.windTrue + twa - 180);
      lines.push(new google.maps.Polyline({
        path: [
          {lat: p1.lat, lng: p1.lon},
          {lat: course.marks.windward.wgs.lat, lng: course.marks.windward.wgs.lon},
          {lat: p2.lat, lng: p2.lon}
          ],
        geodesic: true,
        strokeColor: "green",
        strokeOpacity: 1,
        strokeWeight: 1
      }));
    }

    return lines;
  };

  var createLocationMarkers = function($scope) {
    // This just uses the pointer from location-arrow.svg
    markLocation.moving = new google.maps.Marker({
      map: $scope.map,
      position: {lat: 0, lng: 0},
      icon: {
        path: "m 0.156256,-38.000002 -17,27.500001 0.0078,0 a 20,20 0 0 1 16.992188,-9.5 20,20 0 0 1 16.6875,8.994141 l -16.6875,-26.994142 z",
        fillColor: "#235ade",
        fillOpacity: .90,
        scale: 0.5,
        strokeWeight: 0,
        strokeColor: "ffffff"
      },
      visible: false
    });

    // Scale the marker to 50%
    markLocation.stationary = new google.maps.Marker({
      map: $scope.map,
      position: {lat: 0, lng: 0},
      flat: true,
      optimized: false, // Don't use canvas so the animations work
      icon: {
        url: "img/location.svg",
        anchor: new google.maps.Point(25, 25),
        scaledSize: new google.maps.Size(50, 50),
      },
      title: "My location",
      visible: false
    });
  };

  var createMarker = function(mark, icon) {
    var marker = new google.maps.Marker({
      icon: icon,
      position: {lat: mark.wgs.lat, lng: mark.wgs.lon},
      title: mark.name,
      courseMark: mark
    });

    return marker;
  };

  var createMarks = function($scope) {
    var course = $scope.course;
    var marks = [];

    // The course marks
    angular.forEach(course.marks.list, function(item, index) {
      marks.push(createMarker(item, iconMark));
    });

    // Pin end
    if (course.marks.pin !== course.marks.leeward) {
      var icon = angular.copy(iconMark);
      icon.scale = 6;
      icon.strokeWeight = 3;

      marks.push(createMarker(course.marks.pin, icon));
    }

    // Committee boat
    var cbIcon = angular.copy(iconBoat);
    cbIcon.rotation = course.windTrue;
    var cbMarker = createMarker(course.marks.cb, cbIcon);
    cbMarker.setOptions({draggable: true});
    marks.push(cbMarker);

    // Add everything to the map
    angular.forEach(marks, function(item, index) {
      item.setMap($scope.map);
      item.addListener("click", function(e) {
        if ($scope.markClickCallback)
          $scope.markClickCallback({mark: this.courseMark});
      });
    });

    // Hook the drag event for the committee boat
    google.maps.event.addListener(cbMarker, "dragend", function(e) {
      if ($scope.markDragCallback) {
        $scope.markDragCallback({
          mark: this
        });
      }
    });

    $scope.markers = marks;
  };

  var loadIcons = function() {
    iconBoat = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      fillColor: "white",
      fillOpacity: 1,
      scale: 5,
      strokeColor: "blue",
      strokeWeight: 2
    };

    iconMark = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: "black",
      fillOpacity: 0,
      scale: 10,
      strokeColor: "yellow",
      strokeWeight: 5
    };
  };

  var loadMap = function($scope, $element, $attrs) {
    var center, zoom;
    if ($scope.configuration) {
      center = {
        lat: $scope.configuration.course.startPosition.lat || 0,
        lng: $scope.configuration.course.startPosition.lon || 0
      };
      zoom = 13;
    } else {
      center = {lat: 0, lng: 0};
      zoom = 8;
    }

    $scope.map = new google.maps.Map($element[0], {
      center: center,
      zoom: zoom,
      streetViewControl: false
    });

    loadIcons();
    createLocationMarkers($scope);

    $scope.$watch("course", function(newValue, oldValue) {
      $scope.drawCourse();

      // Fit bounds may have to be done again if the map isn't visible
      if (!$element[0].offsetHeight && !$element[0].offsetWidth) {
        $scope.doFitBounds = true;
      }
    }, true);

    $scope.$watch("position", function(newValue, oldValue) {
      onPositionChanged($scope, newValue, oldValue);

      if ($scope.position && $scope.position.showOnChart) {
        delete $scope.position.showOnChart;
        $scope.map.setCenter({
          lat: $scope.position.coords.latitude,
          lng: $scope.position.coords.longitude
        });
        $scope.map.setZoom(14);
      }
    }, true);

    google.maps.event.addDomListener($window, "resize", function() {
      $timeout(function() {
        google.maps.event.trigger($scope.map, "resize");

        // If changes were made when not visible, fit bounds is required
        if ($scope.doFitBounds)
          $scope.map.fitBounds($scope.bounds);
        $scope.doFitBounds = false;
      });
    });

    $scope.drawCourse = function() {
      // Clear any existing markers and lines
      if ($scope.markers) {
        angular.forEach($scope.markers, function(item, index) {
          item.setMap(null);
        });
      }
      if ($scope.lines) {
        angular.forEach($scope.lines, function(item, index) {
          item.setMap(null);
        });
      }

      if (!$scope.course)
        return;

      createMarks($scope);

      // The line of the course
      $scope.lines = createLines($scope.course);
      angular.forEach($scope.lines, function(item, index) {
        item.setMap($scope.map);
      });

      // Zoom to the bounds
      $scope.bounds = new google.maps.LatLngBounds();
      angular.forEach($scope.markers, function(item, index) {
        $scope.bounds.extend(item.position);
      });

      // Only fit bounds if the map has a size
      if ($element[0].offsetWidth && $element[0].offsetHeight) {
        $scope.map.fitBounds($scope.bounds);
      }
    };

    $timeout(function() {
      $scope.drawCourse();
    });
  };

  var onPositionChanged = function($scope, newValue, oldValue) {
    var position = $scope.position;

    if (position && position.coords) {
      var latlng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      if (!markLocation.stationary.getVisible())
        markLocation.stationary.setVisible(true);

      markLocation.stationary.setPosition(latlng);

      if (position.coords.heading && position.coords.speed) {
        markLocation.moving.icon.rotation = position.coords.heading;
        markLocation.moving.setPosition(latlng);

        if (!markLocation.moving.getVisible())
          markLocation.moving.setVisible(true);

      } else {
        markLocation.moving.setVisible(false);

      }

    } else {
      markLocation.moving.setVisible(false);
      markLocation.stationary.setVisible(false);
    }
  };

  return {
    restrict: "E",
    replace: true,

    templateUrl: "templates/directive-chart.html",

    link: function($scope, $element, $attrs) {
      if ($window.google && $window.google.maps) {
        // Load immediately if maps are available
        loadMap($scope, $element, $attrs);

      } else {
        // Wait for the maps loaded event to fire
        $scope.$on("maps.loaded", function(event) {
          loadMap($scope, $element, $attrs);
        });
      }
    },

    scope: {
      course: "=course",
      markDragCallback: "&markDrag",
      markClickCallback: "&markClick",
      position: "=position"
    }
  };
})

;
