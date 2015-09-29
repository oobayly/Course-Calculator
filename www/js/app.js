angular.module("CourseCalculator.controllers", []);
angular.module("CourseCalculator.services", []);

angular.module("CourseCalculator", ["ionic",
                                     "CourseCalculator.controllers", "CourseCalculator.services"
                                    ])

.run(function($ionicPlatform, $rootScope, $window) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }

    // Broadcast cordova events
    document.addEventListener("offline", function() {
      $rootScope.$broadcast("cordova.offline");
    }, false);
    document.addEventListener("online", function() {
      $rootScope.loadMapsAPI();
      $rootScope.$broadcast("cordova.online");
    }, false);
    document.addEventListener("pause", function() {
      $rootScope.$broadcast("cordova.pause");
    }, false);
    document.addEventListener("resume", function() {
      $rootScope.$broadcast("cordova.resume");
    }, false);


  });

  // Loads the google maps scripts
  $rootScope.loadMapsAPI = function() {
    // No need if maps are already loaded
    if ($window.google && $window.google.maps)
      return;

    // Make sure we're connected
    if (navigator.connection && (navigator.connection.type === Connection.NONE))
      return;

    var script = document.createElement('script');
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyAfszj4UuwlX01nQ-oVUsYgB3NbEahz8pU&sensor=true&callback=onMapsApiLoaded";
    script.type = "text/javascript";
    document.head.appendChild(script);
  };

  $window.onMapsApiLoaded = function(response) {
    $rootScope.$broadcast("maps.loaded");
  };

  $rootScope.loadMapsAPI();

  // This is the local settings version, as opposed to the app version
  $rootScope.VERSION = "0.0.1";
})

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  
  // The Main state
  .state("main", {
    url: "/main",
    templateUrl: "templates/main.html"
  })
  ;

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/main');

});

function handleOpenURL(url) {
  console.log(url);
};
