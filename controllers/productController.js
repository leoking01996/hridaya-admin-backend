const Product = require("../models/product");
const uploadImage = require("../utils/uploadImage");

exports.addProduct = async (req, res) => {
  try {
    const { product_name, price } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    // Upload image to Cloudinary
    const result = await uploadImage(req.file.buffer);

    // Save product
    const product = await Product.create({
      product_name,
      price,
      image: result.secure_url,
      public_id: result.public_id,
    });

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: product,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};