angular.module("CourseCalculator.services")

.service("geomag", function($http, $q) {
  // Calculates the magnetic declination for the specified point
  this.getDeclination = function(params) {
    params.date = params.date || new Date();
    params.alt = params.alt || 0;

    var q = $q.defer();

    $http.get("lib/geomagJS/WMM.COF")
    .then(function(response) {

      var wmm = cof2Obj(response.data);
      var geoMag = geoMagFactory(wmm);

      var result = geoMag(params.lat, params.lon, params.alt, params.date);
      q.resolve(result.dec);

    }).catch(function(error) {
      q.reject(error);
    });

    return q.promise;
  }
});
