const httpStatus = require('http-status');
const axios = require('axios');
const { Location } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const config = require('../config/config');

const MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_API_KEY = config.googleMaps.apiKey;


const requireMapsKey = () => {
  if (!GOOGLE_API_KEY) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Google Maps integration is not configured on this server.'
    );
  }
};


const mapsRequest = async (endpoint, params = {}) => {
  requireMapsKey();

  try {
    const { data } = await axios.get(`${MAPS_BASE_URL}/${endpoint}/json`, {
      params: { ...params, key: GOOGLE_API_KEY },
    });

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      logger.error(`Google Maps API error [${endpoint}]: ${data.status} – ${data.error_message}`);
      throw new ApiError(
        httpStatus.BAD_GATEWAY,
        `Google Maps API error: ${data.error_message || data.status}`
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error(`Google Maps request failed [${endpoint}]:`, err.message);
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Failed to reach Google Maps API');
  }
};

// ─── Geocoding ────────────────────────────────────────────────────────────────

const geocodeAddress = async (address) => {
  const data = await mapsRequest('geocode', { address });

  if (!data.results.length) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Address could not be geocoded');
  }

  const [result] = data.results;
  const { lat, lng } = result.geometry.location;

  return {
    formattedAddress: result.formatted_address,
    lat,
    lng,
    placeId: result.place_id,
    components: result.address_components,
  };
};

const reverseGeocode = async (lat, lng) => {
  const data = await mapsRequest('geocode', { latlng: `${lat},${lng}` });

  if (!data.results.length) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Coordinates could not be reverse-geocoded');
  }

  const [result] = data.results;
  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    components: result.address_components,
  };
};


const getNearbyPlaces = async ({ lat, lng, radius, type }) => {
  const data = await mapsRequest('place/nearbysearch', {
    location: `${lat},${lng}`,
    radius,
    type,
  });

  return data.results.map((place) => ({
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    rating: place.rating ?? null,
    types: place.types,
    openNow: place.opening_hours?.open_now ?? null,
    photo: place.photos?.[0]
      ? `${MAPS_BASE_URL}/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
      : null,
  }));
};


const buildStaticMapUrl = (location) => {
  if (!GOOGLE_API_KEY) return null;

  const { lat, lng } = location.coordinates ?? {};
  if (!lat || !lng) return null;

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '15',
    size: '800x400',
    maptype: 'roadmap',
    markers: `color:red|label:E|${lat},${lng}`,
    key: GOOGLE_API_KEY,
  });

  return `${MAPS_BASE_URL}/staticmap?${params.toString()}`;
};


const createLocation = async (locationBody) => {
  const { address, lat, lng, organizerId, ...rest } = locationBody;

  let coordinates = { lat, lng };
  let formattedAddress = address;
  let placeId = locationBody.placeId;

  if (!lat || !lng) {
    if (!address) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Either coordinates (lat/lng) or an address must be provided'
      );
    }

    if (GOOGLE_API_KEY) {
      const geo = await geocodeAddress(address);
      coordinates = { lat: geo.lat, lng: geo.lng };
      formattedAddress = geo.formattedAddress;
      placeId = placeId || geo.placeId;
    }
  }

  return Location.create({
    ...rest,
    organizer: organizerId,
    address: formattedAddress,
    ...(placeId ? { placeId } : {}),
    ...(coordinates.lat && coordinates.lng ? { coordinates } : {}),
  });
};

const getLocationById = async (id) =>
  Location.findById(id).populate('organizer', 'name email');

const updateLocationById = async (locationId, organizerId, updateBody) => {
  const location = await Location.findOne({ _id: locationId, organizer: organizerId });
  if (!location) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location not found or access denied');
  }


  if (updateBody.address && !updateBody.lat && !updateBody.lng && GOOGLE_API_KEY) {
    const geo = await geocodeAddress(updateBody.address);
    updateBody.coordinates = { lat: geo.lat, lng: geo.lng };
    updateBody.address = geo.formattedAddress;
    updateBody.placeId = geo.placeId;
  }

  Object.assign(location, updateBody);
  await location.save();
  return location;
};

const deleteLocationById = async (locationId, organizerId) => {
  const location = await Location.findOneAndDelete({ _id: locationId, organizer: organizerId });
  if (!location) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location not found or access denied');
  }
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
  getNearbyPlaces,
  buildStaticMapUrl,
  createLocation,
  getLocationById,
  updateLocationById,
  deleteLocationById,
};