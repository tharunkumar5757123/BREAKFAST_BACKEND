const nodemailer = require("nodemailer");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const User = require("../models/authModel");

const otpStore = {};

const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// 📩 Send OTP
const sendOtp = async (req, res) => {
  try {
    const { email, phone, emailOrPhone } = req.body;
    const identifier = email || phone || emailOrPhone;

    if (!identifier)
      return res.status(400).json({ message: "Email or phone number required" });

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore[identifier] = { otp, expiresAt };

    // ✉️ Email OTP
    if (identifier.includes("@")) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: identifier,
        subject: "🔐 Your Login OTP - Fast Breakfast",
        html: `<h2>Your OTP is <b>${otp}</b></h2><p>This code expires in 5 minutes.</p>`,
      });
    }

    // 📱 SMS OTP
    if (/^[0-9]{10,}$/.test(identifier)) {
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE,
        to: `+91${identifier}`,
        body: `Your Fast Breakfast OTP is ${otp}. It expires in 5 minutes.`,
      });
    }

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res
      .status(500)
      .json({ message: "Failed to send OTP", details: error.message });
  }
};

// ✅ Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, phone, emailOrPhone, otp } = req.body;
    const identifier = email || phone || emailOrPhone;

    if (!otpStore[identifier])
      return res.status(400).json({ message: "No OTP found or expired" });

    const { otp: storedOtp, expiresAt } = otpStore[identifier];

    if (Date.now() > expiresAt) {
      delete otpStore[identifier];
      return res.status(400).json({ message: "OTP expired" });
    }

    if (storedOtp.toString() !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    delete otpStore[identifier];

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res
      .status(500)
      .json({ message: "Failed to verify OTP", details: error.message });
  }
};

module.exports = { sendOtp, verifyOtp };
