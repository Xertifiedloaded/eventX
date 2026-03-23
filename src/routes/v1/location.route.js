const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const locationValidation = require('../../validations/location.validation');
const locationController = require('../../controllers/location.controller');

const router = express.Router();

router.get('/geocode',         auth(), validate(locationValidation.geocodeAddress),   locationController.geocodeAddress);
router.get('/reverse-geocode', auth(), validate(locationValidation.reverseGeocode),   locationController.reverseGeocode);
router.get('/nearby',          auth(), validate(locationValidation.getNearbyPlaces),  locationController.getNearbyPlaces);
router.post('/', auth('manageLocations'), validate(locationValidation.createLocation), locationController.addLocation);
router.get('/:locationId',            auth(), validate(locationValidation.getLocation),    locationController.getLocation);
router.patch('/:locationId',          auth('manageLocations'), validate(locationValidation.updateLocation), locationController.updateLocation);
router.delete('/:locationId',         auth('manageLocations'), validate(locationValidation.deleteLocation), locationController.deleteLocation);
router.get('/:locationId/static-map', auth(), validate(locationValidation.getLocation),   locationController.getStaticMapUrl);

module.exports = router;