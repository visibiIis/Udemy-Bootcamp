const mongoose = require("mongoose");
const slugify = require("slugify");
const geocoder = require("../utils/geocoder");

const BootcampSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please, add name"],
            unique: true,
            trim: true,
            maxlength: [50, "Name can't be more than 50 chars"],
        },
        slug: String,
        description: {
            type: String,
            required: [true, "Please, add description"],
            maxlength: [500, "Name can't be more than 500 chars"],
        },
        website: {
            type: String,
            match: [
                /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                "Please, use valid URL with HTTP/HTTPS",
            ],
        },
        phone: {
            type: String,
            maxlength: [20, "Phone number can't be more than 20 chars"],
        },
        email: {
            type: String,
            match: [
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please, add valid email",
            ],
        },
        address: {
            type: String,
            required: [true, "Please, add an address"],
        },
        location: {
            // GeoJSON Point
            type: {
                type: String,
                enum: ["Point"],
            },
            coordinates: {
                type: [Number],
                index: "2dsphere",
            },
            formattedAddress: String,
            street: String,
            city: String,
            state: String,
            zipcode: String,
            country: String,
        },
        careers: {
            // Array of strings
            type: [String],
            required: true,
            enum: [
                "Web Development",
                "Mobile Development",
                "UI/UX",
                "Data Science",
                "Business",
                "Other",
            ],
        },
        averageRating: {
            type: Number,
            min: [1, "Raing must be 1 at least"],
            max: [10, "Rating can't be more than 10"],
        },
        averageCost: Number,
        photo: {
            type: String,
            default: "no-photo.jpg",
        },
        housing: {
            type: Boolean,
            default: false,
        },
        jobAssistance: {
            type: Boolean,
            default: false,
        },
        jobGuarantee: {
            type: Boolean,
            default: false,
        },
        acceptGi: {
            type: Boolean,
            default: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Create bootcamp slug from name
BootcampSchema.pre("save", function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Geocoder & location
BootcampSchema.pre("save", async function (next) {
    const loc = await geocoder.geocode(this.address);
    this.location = {
        type: "Point",
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        street: loc[0].streetName,
        city: loc[0].city,
        state: loc[0].stateCode,
        zipcode: loc[0].zipcode,
        country: loc[0].countryCode,
    };

    // Don't save address
    this.address = undefined;
    next();
});

// Cascade delete courses with bootcamp
BootcampSchema.pre("remove", async function (next) {
    console.log(
        `Courses beeing removed from bootcamp ${this._id} (${this.name})`
    );
    await this.model("Course").deleteMany({ bootcamp: this._id });
    next();
});

// Reverse populate with virtuals
BootcampSchema.virtual("courses", {
    ref: "Course",
    localField: "_id",
    foreignField: "bootcamp",
    justOne: false,
});

module.exports = mongoose.model("Bootcamp", BootcampSchema);
