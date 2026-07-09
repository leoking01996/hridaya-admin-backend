import express from "express";
import Admin from "../models/admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendOtpEmail from "../utils/sendOtp.js";
import verifyToken from "../middleware/verifyToken.js";
import CandleType from "../models/candleType.js";
import Product from "../models/product.js";
import Variant from "../models/variant.js";
import Merchant from "../models/merchant.js";
import Order from "../models/order.js";
import multer from "multer";
// import path from "path";
import upload from "../middleware/upload.js";
import { v4 as uuidv4 } from "uuid";
// import fs from "fs";

// const uploadDir = "uploads";

// create folder if not exists
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
//   console.log("Uploads folder created");
// }


const router = express.Router();
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir);
//   },

//   filename: function (req, file, cb) {
//     const ext = path.extname(file.originalname);
//     const uniqueName =
//       Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

//     cb(null, uniqueName);
//   },
// });

// const upload = multer({ storage });




// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newAdmin = new Admin({
      full_name,
      email,
      password: hashedPassword,
      role,
      otp,
      otpExpires: new Date(Date.now() + 5 * 60 * 1000),
      isVerified: false,
    });

    await newAdmin.save();

    await sendOtpEmail(email, otp);

    return res.status(201).json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
router.post("/fromAdminRegister", async (req, res) => {
  try {
    const { full_name, email, password, role, isVerified } = req.body;

    // validation
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    // check existing admin
    const existing = await Admin.findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create admin
    const newAdmin = new Admin({
      full_name,
      email,
      password: hashedPassword,
      role: role || "admin",

   
      isVerified: isVerified ?? false,
    });

    await newAdmin.save();

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: newAdmin,
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ================= DELETE ADMIN =================

router.delete("/deleteAdmin/:id", verifyToken, async (req, res) => {
  console.log("TOKEN USER:", req.user); 
  try {
    const { id } = req.params;

    // ✅ get role from token (NOT body)
    const role = req.user.role;

    if (role !== "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Only super-admin can delete admin",
      });
    }

    const deleted = await Admin.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.json({
      success: true,
      message: "Admin deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================= VERIFY OTP =================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (admin.isVerified) {
      return res.json({
        success: true,
        message: "Already verified",
      });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (admin.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    admin.isVerified = true;
    admin.otp = null;
    admin.otpExpires = null;

    await admin.save();

    return res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log("OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ================= LOGIN =================
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const admin = await Admin.findOne({ email });

//     if (!admin) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const isMatch = await bcrypt.compare(password, admin.password);

//     if (!isMatch) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const token = jwt.sign(
//       { id: admin._id ,
//         role: admin.role
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     return res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: admin,
//     });
//   } catch (error) {
//     console.log("LOGIN ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });
// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email",
      });
    }

    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Wrong Password",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.json({
      success: true,
      token,
      user: admin,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =================GET LOGIN =================
router.get("/admins", verifyToken, async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");

    res.json({
      success: true,
      data: admins
    });

  } catch (error) {
    console.log("GET ADMINS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// product type
router.post("/productType", async (req, res) => {
  try {
    const { typename, description } = req.body;

    const newType = new CandleType({
      typename,
      description,
    });

    const saved = await newType.save();

    res.status(201).json({
      success: true,
      message: "Candle type created",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// product type edit
router.put("/productType/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { typename, description } = req.body;

    const updated = await CandleType.findByIdAndUpdate(
      id,
      {
        typename,
        description,
      },
      {
        new: true,        // return updated data
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Candle type not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Candle type updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ➤ GET ALL
router.get("/productTypeList", async (req, res) => {
  try {
    const data = await CandleType.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ➤ GET BY ID
router.get("/productType/:id", async (req, res) => {
  try {
    const data = await CandleType.findById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ➤ UPDATE
router.put("/productType/:id", async (req, res) => {
  try {
    const updated = await CandleType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      message: "Updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ➤ DELETE
router.delete("/productType/:id", async (req, res) => {
  try {
    await CandleType.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================
// CREATE PRODUCT + VARIANTS
// =====================================
router.post("/addProduct", upload.any(), async (req, res) => {
  try {
    const {
      name,
      type,
      short_description,
      price
    } = req.body;

    const variants = JSON.parse(req.body.variants || "[]");

    const product_id = uuidv4();

    // main image
 const mainImage =
req.files.find(f => f.fieldname === "image")?.path || "";

    const newProduct = await Product.create({
      product_id,
      name,
      type,
      short_description,
      price,
      image: mainImage
    });

    let savedVariants = [];

    for (let i = 0; i < variants.length; i++) {
      const item = variants[i];

     const variantImages = req.files
.filter(f => f.fieldname === `variant_images_${i}[]`)
.map(img => img.path);

      const newVariant = await Variant.create({
        variant_id: uuidv4(),
        product_id,

        variant_name: item.variant_name,
        long_description: item.long_description,
        price: item.price,
        images: variantImages,
        size: item.size,
        color: item.color,
        fragrance: item.fragrance,
        shape: item.shape,
        weight: item.weight,
        burn_time: item.burn_time,
        stock: item.stock,
        sku: item.sku
      });

      savedVariants.push(newVariant);
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
      variants: savedVariants
    });

  } catch (error) {
    console.log("ADD PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// =====================================
// CREATE VARIANTS
// =====================================

router.post("/addVariant/:product_id", upload.any(), async (req, res) => {
  try {
    const product_id = req.params.product_id;

    const variants = JSON.parse(req.body.variants || "[]");

    // check product exists
    const product = await Product.findOne({ product_id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    let savedVariants = [];

    for (let i = 0; i < variants.length; i++) {
      const item = variants[i];

      // variant images
      const variantImages = req.files
        .filter((f) => f.fieldname === `variant_images_${i}[]`)
        .map((img) => img.filename);

      const newVariant = await Variant.create({
        variant_id: uuidv4(),
        product_id,

        variant_name: item.variant_name,
        long_description: item.long_description,
        price: item.price,
        images: variantImages,

        size: item.size,
        color: item.color,
        fragrance: item.fragrance,
        shape: item.shape,
        weight: item.weight,
        burn_time: item.burn_time,
        stock: item.stock,
        sku: item.sku
      });

      savedVariants.push(newVariant);
    }

    res.status(201).json({
      success: true,
      message: "Variant added successfully",
      variants: savedVariants
    });

  } catch (error) {
    console.log("ADD VARIANT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// getvarient
router.get("/variants/:product_id", async (req, res) => {
  try {
    const { product_id } = req.params;

    const variants = await Variant.find({ product_id });

    if (!variants || variants.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No variants found for this product",
      });
    }

    res.status(200).json({
      success: true,
      message: "Variants fetched successfully",
      data: variants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// editVarient
router.put("/variant/:id", upload.array("images", 10), async (req, res) => {
  try {
    const oldVariant = await Variant.findById(req.params.id);

    if (!oldVariant) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

    // Parse existing images sent from frontend (kept images)
    let existingImages = [];
    if (req.body.existingImages) {
      existingImages = Array.isArray(req.body.existingImages)
        ? req.body.existingImages
        : [req.body.existingImages]; // handle single string case
    }

    // New uploaded images
    const newImages = req.files ? req.files.map((file) => file.filename) : [];

    // Merge kept old images + new uploads
    const updatedImages = [...existingImages, ...newImages];

    const updated = await Variant.findByIdAndUpdate(
      req.params.id,
      { ...req.body, images: updatedImages },
      { new: true }
    );

    return res.json({ success: true, variant: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
// =====================================
// GET ALL PRODUCTS WITH VARIANTS
// =====================================
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find();

    let finalData = [];

    for (const product of products) {
      const variants = await Variant.find({
        product_id: product.product_id
      });

      finalData.push({
        product,
        variants
      });
    }

    res.json({
      success: true,
      data: finalData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// =====================================
// GET SINGLE PRODUCT + VARIANTS
// =====================================
// router.put("/product/:id", upload.any(), async (req, res) => {
//   try {
//     const product_id = req.params.id;

//     const { name, type, short_description, price } = req.body;

//     // ✅ SAFE JSON PARSE
//     let variants = [];
//     try {
//       variants = JSON.parse(req.body.variants || "[]");
//     } catch (err) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid variants JSON format",
//       });
//     }

//     // Find old product
//     const oldProduct = await Product.findOne({ product_id });

//     if (!oldProduct) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     // =========================
//     // MAIN IMAGE UPDATE
//     // =========================
//     let mainImage = oldProduct.image;

//     if (req.files && req.files.length > 0) {
//       const uploadedMain = req.files.find(
//         (f) => f.fieldname === "image"
//       );

//       if (uploadedMain) {
//         mainImage = uploadedMain.filename;
//       }
//     }

//     // =========================
//     // UPDATE PRODUCT
//     // =========================
//     const updatedProduct = await Product.findOneAndUpdate(
//       { product_id },
//       {
//         name,
//         type,
//         short_description,
//         price,
//         image: mainImage,
//       },
//       { new: true }
//     );

//     // =========================
//     // DELETE OLD VARIANTS
//     // =========================
//     await Variant.deleteMany({ product_id });

//     // =========================
//     // CREATE NEW VARIANTS
//     // =========================
//     const savedVariants = [];

//     for (let i = 0; i < variants.length; i++) {
//       const item = variants[i];

//       const variantImages =
//         (req.files || [])
//           .filter((f) => f.fieldname === `variant_images_${i}[]`)
//           .map((img) => img.filename);

//       const newVariant = await Variant.create({
//         variant_id: uuidv4(),
//         product_id,

//         variant_name: item.variant_name,
//         long_description: item.long_description,
//         price: item.price,

//         size: item.size,
//         color: item.color,
//         fragrance: item.fragrance,
//         shape: item.shape,
//         weight: item.weight,
//         burn_time: item.burn_time,
//         stock: item.stock,
//         sku: item.sku,

//         images: variantImages,
//       });

//       savedVariants.push(newVariant);
//     }

//     return res.json({
//       success: true,
//       message: "Product updated successfully",
//       product: updatedProduct,
//       variants: savedVariants,
//     });
//   } catch (error) {
//     console.error("UPDATE PRODUCT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });
router.put("/product/:id", upload.any(), async (req, res) => {
  try {
    const product_id = req.params.id;

    const { name, type, short_description, price } = req.body;

    const variants = JSON.parse(req.body.variants || "[]");

    // find old product
    const oldProduct = await Product.findOne({ product_id });

    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ✅ handle main image properly
    let mainImage = oldProduct.image;

    if (req.files && req.files.length > 0) {
      const uploadedMain = req.files.find(
        (f) => f.fieldname === "image"
      );

      if (uploadedMain) {
        mainImage = uploadedMain.filename;
      }
    }

    // update product
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id },
      {
        name,
        type,
        short_description,
        price,
        image: mainImage,
      },
      { new: true }
    );

    // delete old variants
    await Variant.deleteMany({ product_id });

    let savedVariants = [];

    for (let i = 0; i < variants.length; i++) {
      const item = variants[i];

      const variantImages = req.files
        .filter((f) => f.fieldname === `variant_images_${i}[]`)
        .map((img) => img.filename);

      const newVariant = await Variant.create({
        variant_id: uuidv4(),
        product_id,

        variant_name: item.variant_name,
        long_description: item.long_description,
        price: item.price,

        images: variantImages,

        size: item.size,
        color: item.color,
        fragrance: item.fragrance,
        shape: item.shape,
        weight: item.weight,
        burn_time: item.burn_time,
        stock: item.stock,
        sku: item.sku,
      });

      savedVariants.push(newVariant);
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
      variants: savedVariants,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// EDIT PRODUCT + VARIANTS
// =====================================
router.put("/product/:id", upload.any(), async (req, res) => {
  try {
    const product_id = req.params.id;

    const {
      name,
      type,
      short_description,
      price
    } = req.body;

    const variants = JSON.parse(req.body.variants || "[]");

    // old product
    const oldProduct = await Product.findOne({ product_id });

    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // main image update
    let mainImage = oldProduct.image;

    const uploadedMain = req.files.find(
      (f) => f.fieldname === "image"
    );

    if (uploadedMain) {
      mainImage = uploadedMain.filename;
    }

    // update product
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id },
      {
        name,
        type,
        short_description,
        price,
        image: mainImage
      },
      { new: true }
    );

    // delete old variants
    await Variant.deleteMany({ product_id });

    let savedVariants = [];

    for (let i = 0; i < variants.length; i++) {
      const item = variants[i];

      const variantImages = req.files
        .filter(
          (f) => f.fieldname === `variant_images_${i}[]`
        )
        .map((img) => img.filename);

      const newVariant = await Variant.create({
        variant_id: uuidv4(),
        product_id,

        variant_name: item.variant_name,
        long_description: item.long_description,
        price: item.price,
        images: variantImages,

        size: item.size,
        color: item.color,
        fragrance: item.fragrance,
        shape: item.shape,
        weight: item.weight,
        burn_time: item.burn_time,
        stock: item.stock,
        sku: item.sku
      });

      savedVariants.push(newVariant);
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
      variants: savedVariants
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// =====================================
// DELETE PRODUCT + VARIANTS
// =====================================
router.delete("/productDelete/:id", async (req, res) => {
  try {
    const product_id = req.params.id;

    const product = await Product.findOne({ product_id });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    await Product.deleteOne({ product_id });

    await Variant.deleteMany({ product_id });

    res.json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// varient delete
router.delete("/variantDelete/:id", async (req, res) => {
  try {
    const variant_id = req.params.id;

    // find variant
    const variant = await Variant.findOne({ variant_id });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    // delete variant
    await Variant.deleteOne({ variant_id });

    res.json({
      success: true,
      message: "Variant deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ================= Add MERCHANT =================


// by Admin
router.post(
  "/addMerchant",
  upload.single("national_id_image"),
  async (req, res) => {
    try {
      console.log(req.body);
      console.log(req.file);

      const {
        full_name,
        email,
        password,
        phone,
        national_id_number,
      } = req.body;

      if (
        !full_name ||
        !email ||
        !password ||
        !phone ||
        !national_id_number
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields required",
        });
      }

      // check existing
      const existing = await Merchant.findOne({ email });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Merchant already exists",
        });
      }

      // SAVE TO MONGODB
      const newMerchant = await Merchant.create({
        merchant_id: Date.now().toString(),

        full_name,
        email,
        password,
        phone,
        national_id_number,

       national_id_image: req.file
? req.file.path
: "",

        status: "pending",
      });

      res.status(201).json({
        success: true,
        message: "Merchant added successfully",
        merchant: newMerchant,
      });
    } catch (error) {
      console.log("ADD MERCHANT ERROR:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// by merchant


router.post(
  "/addMerchantByMerchant",
  upload.single("national_id_image"),
  async (req, res) => {
    try {
      const {
        full_name,
        email,
        password,
        phone,
        national_id_number,
      } = req.body;

      if (!full_name || !email || !password || !phone || !national_id_number) {
        return res.status(400).json({
          success: false,
          message: "All fields required",
        });
      }

      const existing = await Merchant.findOne({ email });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Merchant already exists",
        });
      }

      // ✅ Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

      const newMerchant = await Merchant.create({
        merchant_id: Date.now().toString(),
        full_name,
        email,
        password,
        phone,
        national_id_number,
        national_id_image: req.file ? req.file.filename : "",
        status: "pending",

        // ✅ ADD THIS
        otp,
        otpExpires,
        isVerified: false,
      });

      // ✅ SEND EMAIL
      await sendOtpEmail(email, otp);

      return res.status(201).json({
        success: true,
        message: "OTP sent to email",
        merchant: newMerchant,
      });
    } catch (error) {
      console.log("ADD MERCHANT ERROR:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.post("/verify-merchant-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const merchant = await Merchant.findOne({ email });

    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: "Merchant not found",
      });
    }

    if (merchant.isVerified) {
      return res.json({
        success: true,
        message: "Already verified",
      });
    }

    if (merchant.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (merchant.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    merchant.isVerified = true;
    merchant.otp = null;
    merchant.otpExpires = null;

    await merchant.save();

    return res.json({
      success: true,
      message: "Verified successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
router.get("/merchant/:id", async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    res.json({
      success: true,
      data: merchant,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.put(
  "/merchantStatus/:id",
  verifyToken,
  async (req, res) => {
    try {
      // only admin/super-admin
      if (
        req.user.role !== "admin" &&
        req.user.role !== "super-admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { status } = req.body;

      // validate status
      const allowedStatus = [
        "approved",
        "pending",
        "rejected",
      ];

      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const merchant = await Merchant.findByIdAndUpdate(
        req.params.id,
        {
          status,
        },
        {
          new: true,
        }
      );

      if (!merchant) {
        return res.status(404).json({
          success: false,
          message: "Merchant not found",
        });
      }

      res.json({
        success: true,
        message: "Merchant status updated",
        data: merchant,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// only merchant 
router.post("/merchantLogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const merchant = await Merchant.findOne({ email });

    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ⚠️ plain password check (your DB is not hashed)
    if (merchant.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // optional status check
    if (merchant.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Merchant not approved yet",
      });
    }

    const token = jwt.sign(
      {
        id: merchant._id,
        role: "merchant",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: merchant,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ================= GET ALL MERCHANTS =================
router.get("/merchants", verifyToken, async (req, res) => {
  try {
    // Only admin and super-admin
    if (
      req.user.role !== "admin" &&
      req.user.role !== "super-admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const merchants = await Merchant.find().sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: merchants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ================= UPDATE MERCHANT STATUS =================
router.put("/merchantStatus/:id", verifyToken, async (req, res) => {
  try {
    // Allow only admin and super-admin
    if (
      req.user.role !== "admin" &&
      req.user.role !== "super-admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { status } = req.body;

    const allowedStatus = [
      "pending",
      "approved",
      "rejected",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: status,
        },
      },
      {
        new: true,
      }
    );

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    res.json({
      success: true,
      message: "Merchant status updated successfully",
      data: merchant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================= GET ALL ORDERS =================
router.get("/orders", verifyToken, async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      req.user.role !== "super-admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const orders = await Order.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================= UPDATE ORDER STATUS =================
router.put("/orderStatus/:id", verifyToken, async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      req.user.role !== "super-admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { status } = req.body;

    const allowedStatus = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
        },
      },
      {
        new: true,
      }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


export default router;