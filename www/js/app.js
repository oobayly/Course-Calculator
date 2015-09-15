angular.module("CourseCalculator.controllers", ["cb.x2js"]);
angular.module("CourseCalculator.services", []);

angular.module("CourseCalculator", ["ionic",
                                     "CourseCalculator.controllers", "CourseCalculator.services"
                                    ])

.run(function($ionicPlatform) {
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
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  
  // The Main state
  .state("main", {
    url: "/main",
    templateUrl: "templates/main.html",
    controller: "MainCtrl"
  })
  ;

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/main');

});
