const express = require('express');
const auth = require('../../middlewares/auth');
const upload = require('../../config/multer');
const validate = require('../../middlewares/validate');
const eventController = require('../../controllers/event.controller');
const eventValidation = require('../../validations/event.validation');

const router = express.Router();
router.get(
    '/',
    validate(eventValidation.getEvents),
    eventController.getEvents
);

router.post(
    '/',
    auth('manageEvents'),
    upload.single('coverImage'),
    validate(eventValidation.createEvent),
    eventController.createEvent
);

router.get(
    '/my-events',
    auth('manageEvents'),
    validate(eventValidation.getOrganizerEvents),
    eventController.getOrganizerEvents
);


router.get(
    '/:eventId',
    validate(eventValidation.getEvent),
    eventController.getEvent
);

router.patch(
    '/:eventId',
    auth('manageEvents'),
    upload.single('coverImage'),
    validate(eventValidation.updateEvent),
    eventController.updateEvent
);

router.delete(
    '/:eventId',
    auth('manageEvents'),
    validate(eventValidation.deleteEvent),
    eventController.deleteEvent
);


router.put(
    '/:eventId/location',
    auth('manageEvents'),
    validate(eventValidation.setEventLocation),
    eventController.setEventLocation
);

router.post(
    '/:eventId/location',
    auth('manageEvents'),
    validate(eventValidation.createInlineLocation),
    eventController.createInlineLocation
);

router.delete(
    '/:eventId/location',
    auth('manageEvents'),
    validate(eventValidation.deleteEvent),
    eventController.removeEventLocation
);

module.exports = router;