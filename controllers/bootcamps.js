const path = require("path");
const Bootcamp = require("../models/Bootcamp");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const geocoder = require("../utils/geocoder");

// @desc:    Get all bootcamps
// @route:   GET /api/v1/bootcamps
// @access:  Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);
});

// @desc:    Get bootcamps within a radius
// @route:   GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access:  Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
    const { zipcode, distance } = req.params;

    // Get lat/lng from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude;

    // Calc radius by radians
    // Earth radius = 3963 mi / 6378 km
    const radius = distance / 6378;

    const bootcamps = await Bootcamp.find({
        location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps,
    });
});

// @desc:    Get one bootcamp
// @route:   GET /api/v1/bootcamps/:id
// @access:  Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id).populate({
        path: "courses",
        select: "title weeks tuition minimumSkill",
    });

    if (!bootcamp) {
        return next(
            new ErrorResponse(
                `Bootcamp not found with id '${req.params.id}'`,
                404
            )
        );
    }

    res.status(200).json({
        success: true,
        data: bootcamp,
    });
});

// @desc:    Create bootcamp
// @route:   POST /api/v1/bootcamps
// @access:  Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
    req.body.user = req.user.id;

    const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

    if (publishedBootcamp && req.user.role !== "admin") {
        return next(
            new ErrorResponse(
                `The user with ID ${req.user.id} has already published a bootcamp`,
                400
            )
        );
    }

    const bootcamp = await Bootcamp.create(req.body);

    res.status(201).json({
        success: true,
        data: bootcamp,
    });
});

// @desc:    Update bootcamp
// @route:   PUT /api/v1/bootcamps/:id
// @access:  Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidatros: true,
    });

    if (!bootcamp) {
        return next(
            new ErrorResponse(
                `Bootcamp not found with id '${req.params.id}'`,
                404
            )
        );
    }

    res.status(200).json({
        success: true,
        data: bootcamp,
    });
});

// @desc:    Delete bootcamp
// @route:   DELETE /api/v1/bootcamps/:id
// @access:  Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(
                `Bootcamp not found with id '${req.params.id}'`,
                404
            )
        );
    }

    bootcamp.remove();

    res.status(200).json({
        success: true,
        data: {},
    });
});

// @desc:    Upload photo for bootcamp
// @route:   UPDATE /api/v1/bootcamps/:id/photos
// @access:  Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(
            new ErrorResponse(
                `Bootcamp not found with id '${req.params.id}'`,
                404
            )
        );
    }

    if (!req.files) {
        return next(new ErrorResponse("Please upload a file", 400));
    }

    const file = req.files.file;

    // Check mimetype
    if (!file.mimetype.startsWith("image")) {
        return next(new ErrorResponse("Please upload an image file", 400));
    }

    // Check filesize
    if (file.size > process.env.MAX_UPLOAD_SIZE) {
        return next(
            new ErrorResponse(
                `Please upload an image less than ${process.env.MAX_UPLOAD_SIZE} bytes`,
                400
            )
        );
    }

    // Custom filename
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
        if (err) {
            return next(new ErrorResponse(`Problem with file upload`, 500));
        }

        await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

        res.status(200).json({
            success: true,
            data: file.name,
        });
    });
});
