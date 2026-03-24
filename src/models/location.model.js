const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const coordinatesSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 200,
    },
    address: {
      type: String,
      trim: true,
      required: true,
    },
    coordinates: {
      type: coordinatesSchema,
      required: true,
    },
    placeId: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    capacity: {
      type: Number,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

locationSchema.index({ coordinates: "2dsphere" });
locationSchema.plugin(toJSON);
locationSchema.plugin(paginate);

const Location = mongoose.model("Location", locationSchema);

module.exports = Location;
