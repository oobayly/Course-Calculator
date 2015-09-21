angular.module("CourseCalculator.controllers")

.controller("LocationModalCtrl", function($scope
                                 ) {
  
  // The types of input formats
  $scope.modes = {
    d: "ddd.dddddd °",
    dm: "ddd° mm.mmmm'",
    dms: "ddd° mm' ss.ss\""
  };
  
  // The available hemispheres
  $scope.hemispheres = [
    {name: "North", type: "lat", sign: 1},
    {name: "South", type: "lat", sign: -1},
    {name: "East", type: "lon", sign: 1},
    {name: "West", type: "lon", sign: -1},
  ];
  
  // Gets whether the minutes should be shown
  $scope.canShowMinutes = function() {
    return $scope.params.mode.indexOf("m") !== -1;
  };
  
  // Gets whether the seonds should be shown
  $scope.canShowSeconds = function() {
    return $scope.params.mode.indexOf("s") !== -1;
  };
  
  // Called when the accept button is clicked
  $scope.doAccept = function() {
    var result = {};
    
    if ($scope.params.showLat)
      result.lat = $scope.params.lat.value;
    
    if ($scope.params.showLon)
      result.lon = $scope.params.lon.value;
    
    $scope.doClose(result);
  };
  
  // Raised when the mode is changed
  $scope.onModeChange = function() {
    $scope.params.lat.mode = $scope.params.mode;
    $scope.params.lon.mode = $scope.params.mode;
  };
  
})

// Shows the location modal
// params: {showLat: false, showLon: false, lat: 0, lon: 0}
.service("LocationModal", function($q, $rootScope, $window,
                                   $ionicModal
                                   ) {
  
  this.getDMS = function(mode, value) {
    var dms = {
      sign: 1,
      d: 0,
      m: 0,
      s: 0,
      __mode: "d",
      
      get deg() {
        return Math.round(1e6 * this.d) / 1e6; // 6 decimal places
      },
      
      set deg(value) {
        value = value || 0;

        switch (this.mode) {
          case "d":
            this.d = Math.abs(value);
            break;
          case "dm":
          case "dms":
            this.d = Math.floor(Math.abs(value));
            break;
        }
      },
      
      get min() {
        var resp;
        switch (this.mode) {
          case "d":
            resp = 0;
            break;
          case "dm":
          case "dms":
            resp = this.m;
            break;
        }
        
        return Math.round(1e4 * resp) / 1e4; // 4 decimal places
      },
      
      set min(value) {
        value = value || 0;

        switch (this.mode) {
          case "d":
            this.m = 0;
            break;
          case "dm":
            this.m = Math.abs(value);
            break;
          case "dms":
            this.m = Math.floor(Math.abs(value));
            break;
        }
      },
      
      get mode() {
        return this.__mode;
      },
      
      set mode(value) {
        // Cache the current value
        var temp = this.value;
        
        switch (value) {
          case "d":
          case "dm":
          case "dms":
            this.__mode = value;
            this.value = temp;
            break;
          default:
            throw "'" + value + "' is not a valid mode";
        }
      },
      
      get sec() {
        var resp;
        switch (this.mode) {
          case "d":
          case "dm":
            resp = 0;
            break;
          case "dms":
            resp = this.s;
            break;
        }
        
        return Math.round(1e2 * resp) / 1e2; // 2 decimal places
      },
      
      set sec(value) {
        value = value || 0;

        switch (this.mode) {
          case "d":
          case "dm":
            this.s = 0;
            break;
          case "dms":
            this.s = Math.abs(value);
            break;
        }
      },
      
      get value() {
        var resp = this.sign * (this.deg + (this.min / 60) + (this.sec / 3600));
        
        return Math.round(1e6 * resp) / 1e6; // 6 decimal places
      },
      
      set value(value) {
        if ((value === null) || (typeof value === "undefined"))
          return;
        
        this.sign = value < 0 ? -1 : 1;
        value = Math.abs(value);
        
        switch (this.mode) {
          case "d":
            this.deg = value;
            this.min = 0;
            this.sec = 0;
            break;
          case "dm":
            this.deg = Math.floor(value);
            this.min = (60 * value) % 60;
            this.sec = 0;
            break;
          case "dms":
            this.deg = Math.floor(value);
            this.min = Math.floor((60 * value) % 60);
            this.sec = (3600 * value) % 60;
            break;
        }
      }
    };
    
    dms.mode = mode;
    dms.value = value;

    return dms;
  };
  
  // Shows the location modal
  this.show = function(params) {
    var q = $q.defer();

    var $scope = $rootScope.$new();
    
    // Use the location information provided
    $scope.params = params;
    
    // Use the previous selected mode, default to decimal degrees
    $scope.params.mode = $window.localStorage.getItem("LocationModal.mode") || "d";
    
    $scope.params.lat = this.getDMS($scope.params.mode, $scope.params.lat || 0);
    $scope.params.lon = this.getDMS($scope.params.mode, $scope.params.lon || 0);
    
    $ionicModal.fromTemplateUrl("templates/modal-location.html", {
      scope: $scope,
      animation: "slide-in-up",
      focusFirstInput: true
    })
    .then(function(modal) {
      $scope.modal = modal;
      modal.show();
    });
    
    $scope.$on("$destroy", function() {
      if ($scope.modal)
        $scope.modal.remove();
    });
    
    // Called when the modal is to be closed
    // Pass optional parameters
    $scope.doClose = function(result) {
      // Cache the last use mode
      if (result)
        $window.localStorage.setItem("LocationModal.mode", $scope.params.mode);

      $scope.modal.hide();

      $scope.modal.remove();
      $scope.modal = null;

      q.resolve(result);
    };

    return q.promise;
  };
  
});
