const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { locationService } = require('../services');
const ApiError = require('../utils/ApiError');

const addLocation = catchAsync(async (req, res) => {
  const location = await locationService.createLocation({
    ...req.body,
    organizerId: req.user.id,
  });
  res.status(httpStatus.CREATED).send(location);
});

const getLocation = catchAsync(async (req, res) => {
  const location = await locationService.getLocationById(req.params.locationId);
  if (!location) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
  }
  res.send(location);
});


const updateLocation = catchAsync(async (req, res) => {
  const location = await locationService.updateLocationById(
    req.params.locationId,
    req.user.id,
    req.body
  );
  res.send(location);
});


const deleteLocation = catchAsync(async (req, res) => {
  await locationService.deleteLocationById(req.params.locationId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});


const geocodeAddress = catchAsync(async (req, res) => {
  const { address } = req.query;
  if (!address) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Address query parameter is required');
  }
  const result = await locationService.geocodeAddress(address);
  res.send(result);
});

const reverseGeocode = catchAsync(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'lat and lng query parameters are required');
  }
  const result = await locationService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  res.send(result);
});

const getNearbyPlaces = catchAsync(async (req, res) => {
  const { lat, lng, radius = 1500, type = 'establishment' } = req.query;
  if (!lat || !lng) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'lat and lng query parameters are required');
  }
  const places = await locationService.getNearbyPlaces({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radius: parseInt(radius, 10),
    type,
  });
  res.send(places);
});


const getStaticMapUrl = catchAsync(async (req, res) => {
  const location = await locationService.getLocationById(req.params.locationId);
  if (!location) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
  }
  const url = locationService.buildStaticMapUrl(location);
  res.send({ url });
});

module.exports = {
  addLocation,
  getLocation,
  updateLocation,
  deleteLocation,
  geocodeAddress,
  reverseGeocode,
  getNearbyPlaces,
  getStaticMapUrl,
};