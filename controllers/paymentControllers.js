require("dotenv").config();
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

/**
 * ✅ Create Stripe checkout session
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { cart, userId } = req.body;

    if (!cart?.length || !userId) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // ✅ Calculate total and prepare line items
    let totalAmount = 0;
    const lineItems = cart.map((item) => {
      const price = Math.max(item.price, 50); // minimum ₹50
      totalAmount += price * item.quantity;
      return {
        price_data: {
          currency: "inr",
          product_data: { name: item.name },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      };
    });

    // ✅ Create compact cart summary (under 500 chars)
    const cartSummary = cart
      .map((item) => `${item.name}×${item.quantity}`)
      .join(", ")
      .slice(0, 490);

    // ✅ Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/payment-cancelled`,
      metadata: {
        userId,
        cartSummary, // short version for Stripe limits
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ Stripe session error:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};

/**
 * ✅ Verify payment + generate PDF + email receipt + delete PDF after sending
 */
const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ message: "Invalid session" });

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    // 🧾 Reconstruct ordered items (from metadata summary)
    let items = [];
    if (session.metadata?.cartSummary) {
      items = session.metadata.cartSummary.split(", ").map((entry) => {
        const [name, qty] = entry.split("×");
        return { name, quantity: Number(qty) || 1, price: 0 };
      });
    }

    const payment = {
      id: session.id,
      amount: (session.amount_total / 100).toFixed(2),
      currency: session.currency,
      status: "PAID",
      receiptUrl: `${CLIENT_URL}/api/payments/receipt/${sessionId}`,
    };

    // ✅ Generate PDF receipt
    const receiptsDir = path.join(__dirname, "../receipts");
    if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });

    const receiptPath = path.join(receiptsDir, `receipt-${sessionId}.pdf`);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(receiptPath);
    doc.pipe(stream);

    doc.fontSize(22).text("🍽️ Restaurant Order Receipt", { align: "center" });
    doc.moveDown();

    if (items.length > 0) {
      doc.fontSize(16).text("🛍️ Ordered Items:");
      items.forEach((item, i) => {
        doc.fontSize(14).text(`${i + 1}. ${item.name} × ${item.quantity}`);
      });
      doc.moveDown();
    }

    doc.fontSize(16).text(`💰 Total Paid: ₹${payment.amount}`);
    doc.text(`Transaction ID: ${payment.id}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown();
    doc.text("Thank you for your order!", { align: "center" });
    doc.end();

    // Wait for PDF generation
    await new Promise((resolve) => stream.on("finish", resolve));

    // ✅ Send receipt email
    if (session.customer_details?.email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const orderedItemsList = items
        .map((i) => `${i.name} × ${i.quantity}`)
        .join("\n");

      const mailOptions = {
        from: `"Restaurant Order" <${process.env.EMAIL_USER}>`,
        to: session.customer_details.email,
        subject: "Your Order Receipt 🍽️",
        text: `Thank you for your payment of ₹${payment.amount}.\n\nOrdered Items:\n${orderedItemsList}\n\nTransaction ID: ${payment.id}\nStatus: ${payment.status}\n\nAttached is your receipt.`,
        attachments: [{ filename: `receipt-${sessionId}.pdf`, path: receiptPath }],
      };

      await transporter.sendMail(mailOptions);
      console.log("📧 Email sent to:", session.customer_details.email);

      // 🗑️ Delete PDF after sending
      fs.unlink(receiptPath, (err) => {
        if (err) console.warn("⚠️ Failed to delete receipt:", err.message);
        else console.log("🗑️ Deleted receipt file:", `receipt-${sessionId}.pdf`);
      });
    } else {
      console.warn("⚠️ No email found in Stripe session");
    }

    res.json({ items, payment });
  } catch (error) {
    console.error("❌ Verify payment error:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};

/**
 * ✅ Serve existing PDF receipt (temporary before deletion)
 */
const getReceipt = (req, res) => {
  try {
    const { sessionId } = req.params;
    const filePath = path.join(__dirname, `../receipts/receipt-${sessionId}.pdf`);

    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/pdf");
      const stream = fs.createReadStream(filePath);

      stream.pipe(res);

      // When the response finishes sending, delete the file
      res.on("finish", () => {
        fs.unlink(filePath, (err) => {
          if (err) console.error("⚠️ Failed to delete receipt:", err);
          else console.log(`🧾 Deleted receipt: ${filePath}`);
        });
      });
    } else {
      res.status(404).json({ message: "Receipt not found" });
    }
  } catch (error) {
    console.error("❌ Receipt error:", error);
    res.status(500).json({ message: "Failed to retrieve receipt" });
  }
};


module.exports = {
  createCheckoutSession,
  verifyPayment,
  getReceipt,
};
