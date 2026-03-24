const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const reviewSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ event: 1, user: 1 }, { unique: true });

reviewSchema.plugin(toJSON);
reviewSchema.plugin(paginate);

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
