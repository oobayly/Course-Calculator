angular.module("CourseCalculator")

.directive("chart", function($rootScope, $timeout, $window, Course) {
  var iconBoat = {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    fillColor: "white",
    fillOpacity: 1,
    scale: 5,
    strokeColor: "blue",
    strokeWeight: 2
  };

  var iconMark = {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: "black",
    fillOpacity: 0,
    scale: 10,
    strokeColor: "yellow",
    strokeWeight: 5
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

  var createMarker = function(mark, icon) {
    var marker = new google.maps.Marker({
      icon: icon,
      position: {lat: mark.wgs.lat, lng: mark.wgs.lon},
      title: mark.name,
      courseMark: mark
    });

    return marker;
  };

  var createMarks = function(course) {
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
    marks.push(createMarker(course.marks.cb, cbIcon));

    return marks;
  };

  return {
    restrict: "E",
    replace: true,

    template: "<div class='google-maps'></div>",

    link: function($scope, $element, $attrs) {
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

      $scope.$watch("course", function(newValue, oldValue) {
        $scope.drawCourse();
      }, true);

      google.maps.event.addDomListener($window, "resize", function() {
        $timeout(function() {
          google.maps.event.trigger($scope.map, "resize");
          $scope.map.fitBounds($scope.bounds);
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

        $scope.markers = createMarks($scope.course);

        // The line of the course
        $scope.lines = createLines($scope.course);

        // Add everything to the map
        angular.forEach($scope.markers, function(item, index) {
          item.setMap($scope.map);
          item.addListener("click", function(e) {
            if ($scope.markClickCallback)
              $scope.markClickCallback({mark: this.courseMark});
          });
        });
        angular.forEach($scope.lines, function(item, index) {
          item.setMap($scope.map);
        });

        // Zoom to the bounds
        $scope.bounds = new google.maps.LatLngBounds();
        angular.forEach($scope.markers, function(item, index) {
          $scope.bounds.extend(item.position);
        });

        $timeout(function() {
          $scope.map.fitBounds($scope.bounds);
        });
      };

      $timeout(function() {
        $scope.drawCourse();
      });
    },

    scope: {
      course: "=course",
      location: "=location",
      markClickCallback: "&markClick"
    }
  };
})

;