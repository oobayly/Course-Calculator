angular.module("CourseCalculator")

.directive("compassRose", function() {
  return {
    restrict: "E",
    replace: false,

    template: "<img src='img/compass.svg' ng-class='{disabled: !hasHeading() && !hasBearing()}' style='transform: translate(-50%, 0) rotate({{getHeading()}});'/>" +
      "<img src='img/compass-arrow.svg' style='transform: translate(-50%, 0) rotate({{getBearing()}});' ng-show='hasBearing()'/>",

    link: function($scope) {
      $scope.hasBearing = function() {
        return typeof $scope.bearing === "number";
      };

      $scope.hasHeading = function() {
        return typeof $scope.heading === "number";
      };

      $scope.getAngle = function(angle) {
        angle = (angle || 0);
        return ((angle + 360) % 360) + "deg";
      };

      $scope.getBearing = function() {
        var delta;
        if ($scope.heading === null) {
          delta = ($scope.bearing || 0) - ($scope.declination || 0);
        } else {
          delta = -($scope.heading || 0) + ($scope.bearing || 0);
        }
        return $scope.getAngle(delta);
      };

      $scope.getHeading = function() {
        var heading = 0;
        if ($scope.heading !== null) {
          var heading = -($scope.heading - ($scope.declination || 0));
        }

        return $scope.getAngle(heading);
      };
    },

    scope: {
      declination: "=declination",
      heading: "=heading",
      bearing: "=bearing"
    }
  };
})

.directive("latLon", function() {
  return {
    restrict: "E",
    replace: true,
    
    template: "<span><span ng-show='hasLat()'>{{getLat()}}</span><span ng-show='hasLon()'>{{getLon()}}</span></span>",
    
    link: function($scope) {
      $scope.getLat = function() {
        return Dms.toLat($scope.lat, $scope.format || "dms", $scope.dp, true);
      };
      
      $scope.getLon = function() {
        return Dms.toLon($scope.lon, $scope.format || "dms", $scope.dp, true);
      };
      
      $scope.hasLat = function() {
        return ($scope.lat !== null) && (typeof $scope.lat !== "undefined");
      };
      
      $scope.hasLon = function() {
        return ($scope.lon !== null) && (typeof $scope.lon !== "undefined");
      };
    },
    
    scope: {
      format: "=format",
      dp: "=decimals",
      lat: "=lat",
      lon: "=lon"
    }
  };
})

.directive("length", function($filter) {
  return {
    restrict: "E",
    replace: true,
    
    template: "<span>" +
      "<span ng-show='!hasValue()'>n/a</span>" +
      "<span ng-show='hasValue()'>{{getMetric()}} ({{getImperial()}})</span>" +
      "<span>",
    
    link: function($scope) {
      $scope.getImperial = function() {
        var feet = $scope.value / 0.3048;
        var yds = feet / 3;
        var inches = Math.round(feet * 12);
        
        var resp;
        if ($scope.showInches) {
          resp = $filter("number")(Math.floor(feet), 0) + " ft";
          
          if (inches % 12)
            resp += " " + $filter("number")(inches % 12, 0) + " in";
          
        } else {
          resp = $filter("number")(feet, $scope.dp || 0) + " ft";
        }
        
        return resp;
      };
      
      $scope.getMetric = function() {
        return $filter("number")($scope.value, $scope.dp || 0) + " m";
      };

      $scope.hasValue = function() {
        return ($scope.value !== null) && (typeof $scope.value !== "undefined");
      };
    },
    
    scope: {
      dp: "=decimals",
      value: "=value",
      showInches: "=showInches"
    }
  };
})

.directive("mfd", function($filter) {
  return {
    restric: "E",
    replace: false,

    templateUrl: "templates/directive-mfd.html",

    link: function($scope) {
      $scope.display = {
        large: "--",
        small: null
      };

      $scope.getUnits = function() {
        var val = $scope.value || 0;
        switch ($scope.type) {
          case "distance":
            return val < 800 ? "metres" : "kilometres";

          case "speed":
            return "knots";

          default:
            return "\u00a0"; // &nbsp;

        }
      };

      $scope.$watch("value", function(newValue, oldValue) {
        if (typeof $scope.value !== "number") {
          $scope.display.large = "--";
          $scope.display.small = null;
          return;
        }

        switch ($scope.type) {
          case "distance":
            var text;
            if ($scope.value > 10000) {
              text = $filter("number")($scope.value / 1000, 1);
            } else if ($scope.value > 1000) {
              text = $filter("number")($scope.value / 1000, 2);
            } else {
              text = $filter("number")($scope.value, 0);
            }

            var decimal = text.indexOf(".");
            if (decimal === -1) {
              $scope.display.large = text;
              $scope.display.small = null;
            } else {
              $scope.display.large = text.substring(0, decimal + 1);
              $scope.display.small = text.substr(decimal + 1);
            }
            break;

          case "speed":
            $scope.display.large = $filter("number")($scope.value, 0);
            $scope.display.small = null;
            break;

          case "time":
            var days = Math.floor($scope.value / 86400);
            var hrs = Math.floor($scope.value / 3600) % 24;
            var min = Math.floor($scope.value / 60) % 60;
            var sec = Math.floor($scope.value) % 60;

            var hrsmin = (hrs < 10 ? "0" + hrs : hrs)
                + ":" + (min < 10 ? "0" + min : min);

            if (days) {
              $scope.display.large = days + "d";
              $scope.display.small = hrsmin;
            } else {
              $scope.display.large = hrsmin;
              $scope.display.small = (sec < 10 ? "0" + sec : sec);

            }
            break;

          default:
            $scope.display.large = $filter("number")($scope.value, 0);
            $scope.display.small = null;
        }
      });
    },

    scope: {
      title: "@title",
      value: "=value",
      type: "@type",
    }
  };
})

;
